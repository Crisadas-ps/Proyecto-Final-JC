import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import Product from './models/Product.js';
import ServiceRequest from './models/ServiceRequest.js';
import User from './models/User.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../frontend/dist');
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGODB_URI) throw new Error('Configura MONGODB_URI en backend/.env');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
}

app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : false);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: false, limit: '15kb' }));

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
console.log('MongoDB conectado correctamente.');

app.use(session({
  name: 'electrofix.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 4 }),
  cookie: { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 4 * 60 * 60 * 1000 }
}));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Demasiados intentos. Espera unos minutos.' } });
app.use('/api', apiLimiter);

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Inicia sesión como administrador.' });
  next();
}

function cleanString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  aiConfigured: false,
  assistantConfigured: true
}));

app.get('/api/products', async (_req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ category: 1, name: 1 }).lean();
    res.json(products);
  } catch (error) {
    console.error('Products GET:', error.message);
    res.status(500).json({ error: 'No se pudo cargar el catálogo.' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const name = cleanString(req.body.name, 80);
    const email = cleanString(req.body.email, 120).toLowerCase();
    const phone = cleanString(req.body.phone, 30);
    const device = cleanString(req.body.device, 100);
    const service = cleanString(req.body.service, 80);
    const message = cleanString(req.body.message, 1000);
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !device || !message || message.length < 10 || !['Mantenimiento preventivo', 'Reparación y diagnóstico', 'Pedido de repuestos'].includes(service)) {
      return res.status(400).json({ error: 'Revisa los campos. La descripción debe tener al menos 10 caracteres.' });
    }
    const code = `EF-${Date.now().toString().slice(-8)}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const request = await ServiceRequest.create({ code, name, email, phone, device, service, message });
    res.status(201).json({ success: true, code: request.code, message: 'Solicitud guardada correctamente.' });
  } catch (error) {
    console.error('Request POST:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la solicitud.' });
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const email = cleanString(req.body.email, 120).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email, active: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      res.json({ success: true, user: req.session.user });
    });
  } catch (error) {
    console.error('Login:', error.message);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ user: req.session.user }));
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'No se pudo cerrar sesión.' });
    res.clearCookie('electrofix.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
    res.json({ success: true });
  });
});

app.get('/api/admin/requests', requireAdmin, async (_req, res) => {
  try {
    const requests = await ServiceRequest.find().sort({ createdAt: -1 }).limit(300).lean();
    res.json(requests);
  } catch (error) {
    console.error('Admin requests:', error.message);
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes.' });
  }
});

app.patch('/api/admin/requests/:id/status', requireAdmin, async (req, res) => {
  try {
    const status = cleanString(req.body.status, 30);
    if (!['Pendiente', 'En proceso', 'Finalizada'].includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
    const updated = await ServiceRequest.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Update status:', error.message);
    res.status(400).json({ error: 'No se pudo actualizar el estado.' });
  }
});


function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getAssistantAnswer(message) {
  const text = normalizeText(message);

  const has = (...words) => words.some(word => text.includes(word));

  if (has('hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches')) {
    return '¡Hola! Bienvenido a ElectroFix. Puedo ayudarte con problemas de laptops, computadores y celulares, además de nuestros servicios y repuestos. ¿Qué necesitas consultar?';
  }

  if (has('precio', 'cuanto cuesta', 'cuanto vale', 'costo', 'cotizacion')) {
    return 'Los precios dependen del tipo de dispositivo y del problema que presente. Puedes revisar nuestro catálogo de repuestos o enviar una solicitud de atención para recibir una evaluación y cotización.';
  }

  if (has('servicio', 'que ofrecen', 'que hacen', 'que realizan')) {
    return 'En ElectroFix ofrecemos tres servicios principales:\n\n1. Mantenimiento preventivo.\n2. Reparación y diagnóstico.\n3. Pedido de repuestos.\n\nPuedes seleccionar el servicio que necesites en nuestro formulario de atención.';
  }

  if (has('mantenimiento', 'limpieza', 'polvo', 'limpiar')) {
    return 'El mantenimiento preventivo ayuda a conservar tus dispositivos en buen estado. Puede incluir limpieza externa, revisión del sistema de ventilación y comprobación general del funcionamiento. Te recomendamos solicitar una evaluación técnica para determinar qué necesita tu equipo.';
  }

  if (has('calienta', 'calentamiento', 'temperatura', 'sobrecalienta', 'calor')) {
    return 'El calentamiento excesivo puede estar relacionado con ventilación obstruida, acumulación de polvo o una carga elevada de trabajo. Coloca el equipo sobre una superficie firme y ventilada. Si continúa calentándose, solicita un diagnóstico técnico. No intentes abrirlo ni manipular sus componentes internos.';
  }

  if (has('lenta', 'lento', 'lentitud', 'se traba', 'congelada', 'congelado')) {
    return 'Si tu equipo está lento, algunas posibles causas son demasiados programas abiertos, poco espacio de almacenamiento o aplicaciones que consumen muchos recursos. Puedes reiniciarlo y cerrar los programas que no estés utilizando. Si el problema continúa, podemos ayudarte con un diagnóstico.';
  }

  if (has('bateria', 'no carga', 'carga', 'cargador')) {
    return 'Los problemas de carga pueden estar relacionados con el cargador, el cable, el puerto o la batería. Comprueba que el cargador no tenga daños visibles y prueba una toma de corriente diferente. Si la batería está hinchada, caliente o dañada, deja de utilizar el dispositivo y solicita asistencia técnica. No intentes manipularla.';
  }

  if (has('pantalla', 'display', 'imagen', 'no enciende la pantalla')) {
    return 'Los problemas de pantalla pueden deberse a fallos de conexión, daños del panel o problemas del sistema. ¿La pantalla está completamente negra, presenta líneas o enciende pero no muestra imagen? Con esa información podremos orientarte mejor.';
  }

  if (has('virus', 'malware', 'publicidad', 'anuncios', 'ventanas emergentes')) {
    return 'La aparición de publicidad no deseada o comportamientos extraños puede estar relacionada con programas no deseados o software malicioso. Evita instalar aplicaciones de fuentes desconocidas y realiza un análisis con una herramienta de seguridad confiable. Si el problema continúa, podemos revisar tu equipo.';
  }

  if (has('repuesto', 'repuestos', 'pieza', 'piezas', 'componente', 'componentes')) {
    return '¡Claro! Contamos con un catálogo de repuestos. Para orientarte sobre la compatibilidad necesitamos conocer la marca y el modelo exacto de tu dispositivo. Puedes consultar el catálogo o seleccionar "Pedido de repuestos" en el formulario.';
  }

  if (has('compatibilidad', 'compatible', 'modelo')) {
    return 'Para comprobar la compatibilidad de un repuesto necesitamos conocer la marca, el modelo exacto y, cuando sea posible, la referencia de la pieza. No podemos garantizar compatibilidad sin verificar esos datos.';
  }

  if (has('celular', 'telefono', 'movil', 'smartphone')) {
    return 'Podemos orientarte sobre problemas comunes de celulares, como fallos de carga, pantalla, rendimiento y batería. Cuéntame la marca, el modelo y qué problema presenta.';
  }

  if (has('laptop', 'portatil', 'computadora', 'computador', 'pc', 'ordenador')) {
    return 'Podemos orientarte sobre laptops y computadores con problemas de rendimiento, temperatura, pantalla, almacenamiento y otros inconvenientes. Cuéntame la marca, el modelo y qué está sucediendo.';
  }

  if (has('garantia', 'garantias')) {
    return 'Las condiciones de garantía deben confirmarse según el servicio o repuesto solicitado. Nuestro personal técnico podrá proporcionarte esa información durante la atención.';
  }

  if (has('horario', 'horarios', 'atienden', 'abierto', 'ubicacion', 'direccion')) {
    return 'Puedes enviar solicitudes de atención desde nuestra página web en cualquier momento. Los horarios de atención presencial deben confirmarse directamente con el personal de ElectroFix.';
  }

  if (has('gracias', 'muchas gracias')) {
    return '¡Con gusto! Gracias por confiar en ElectroFix. Estamos aquí para ayudarte con tus dispositivos.';
  }

  if (has('adios', 'hasta luego', 'chao')) {
    return '¡Hasta pronto! Gracias por visitar ElectroFix. Recuerda que puedes enviar una solicitud de atención cuando lo necesites.';
  }

  return 'Quiero ayudarte con tu consulta, pero necesito un poco más de información. Cuéntame qué dispositivo tienes, su marca y modelo, y qué problema presenta. También puedes preguntarme sobre mantenimiento, reparaciones o repuestos.';
}

app.post('/api/ai', (req, res) => {
  const message = req.body?.message;

  if (
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 2000
  ) {
    return res.status(400).json({
      error: 'Escribe una consulta de hasta 2000 caracteres.'
    });
  }

  try {
    const answer = getAssistantAnswer(message.trim());

    return res.json({
      success: true,
      answer
    });
  } catch (error) {
    console.error('Assistant:', error.message);

    return res.status(500).json({
      error: 'No se pudo procesar tu consulta.'
    });
  }
});

app.use(express.static(frontend));
app.get('/admin', (_req, res) => res.sendFile(path.join(frontend, 'admin.html')));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));

app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`ElectroFix disponible en http://localhost:${PORT}`);
});
