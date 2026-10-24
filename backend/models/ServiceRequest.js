import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  device: { type: String, required: true, trim: true, maxlength: 100 },
  service: { type: String, required: true, enum: ['Mantenimiento preventivo', 'Reparación y diagnóstico', 'Pedido de repuestos'] },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
  status: { type: String, enum: ['Pendiente', 'En proceso', 'Finalizada'], default: 'Pendiente' }
}, { timestamps: true });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
