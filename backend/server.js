import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import Product from './models/Product.js';
import ServiceRequest from './models/ServiceRequest.js';
import User from './models/User.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../frontend');
const isProduction = process.env.NODE_ENV === 'production';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', aiConfigured: Boolean(openai) }));

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

app.post('/api/ai', async (req, res) => {
  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) return res.status(400).json({ error: 'Escribe una consulta de hasta 2000 caracteres.' });
  if (!openai) return res.status(503).json({ error: 'ElectroFix AI no está configurado. Puedes usar el resto del sitio.' });
  try {
    const result = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.5',
      instructions: 'Eres ElectroFix AI. Responde en español, con claridad y brevedad. ElectroFix ofrece mantenimiento preventivo, diagnóstico y reparación de laptops, PC y celulares, además de pedidos de repuestos. Los precios del catálogo son referenciales; nunca inventes stock, compatibilidad, garantía ni plazos. Solicita marca y modelo para orientar sobre compatibilidad. No indiques abrir fuentes de poder, manipular baterías dañadas ni trabajar con equipos conectados a la corriente. No afirmes que puedes consultar solicitudes ni datos privados.',
      input: message.trim(),
      max_output_tokens: 450
    });
    const answer = result.output_text?.trim();
    if (!answer) return res.status(502).json({ error: 'No se recibió respuesta de la IA.' });
    res.json({ success: true, answer });
  } catch (error) {
    console.error('OpenAI:', error.status, error.message);
    res.status(502).json({ error: error.status === 401 ? 'La clave de IA no fue aceptada.' : error.status === 429 ? 'Se alcanzó el límite de uso de IA.' : 'No se pudo conectar con la IA.' });
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
  if (!openai) console.log('Aviso: ElectroFix AI no está configurado (opcional).');
});
