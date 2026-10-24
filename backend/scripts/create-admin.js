import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import User from '../models/User.js';

if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en backend/.env');
const rl = createInterface({ input, output });
try {
  const name = (await rl.question('Nombre del administrador: ')).trim();
  const email = (await rl.question('Correo del administrador: ')).trim().toLowerCase();
  const password = await rl.question('Contraseña (mínimo 12 caracteres): ');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
    throw new Error('Datos inválidos. Revisa nombre, correo y contraseña (mínimo 12 caracteres).');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role: 'admin', active: true },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`Administrador ${email} creado/actualizado correctamente.`);
} finally {
  rl.close();
  if (mongoose.connection.readyState) await mongoose.disconnect();
}
