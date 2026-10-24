import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en backend/.env');

const products = [
  { name: 'SSD NVMe 500 GB', category: 'Almacenamiento', description: 'Unidad de estado sólido para equipos compatibles.', price: 45, icon: '💾' },
  { name: 'RAM DDR4 8 GB', category: 'Memoria', description: 'Módulo de memoria para ampliación. Verificar frecuencia y compatibilidad.', price: 22, icon: '🧠' },
  { name: 'Batería para laptop', category: 'Energía', description: 'Batería de reemplazo según marca y modelo exacto.', price: 38, icon: '🔋' },
  { name: 'Pantalla para celular', category: 'Pantallas', description: 'Repuesto sujeto a disponibilidad y modelo.', price: null, priceOnRequest: true, icon: '📱' },
  { name: 'Cargador universal', category: 'Accesorios', description: 'Cargador para dispositivos compatibles; confirmar voltaje y conector.', price: 18, icon: '🔌' },
  { name: 'Ventilador para PC', category: 'Refrigeración', description: 'Ventilador para mejorar el flujo de aire del gabinete.', price: 12, icon: '🌀' },
  { name: 'Teclado para laptop', category: 'Periféricos', description: 'Repuesto según distribución, conexión y modelo.', price: null, priceOnRequest: true, icon: '⌨️' },
  { name: 'Conector USB / Type-C', category: 'Conectividad', description: 'Requiere diagnóstico técnico y verificación del modelo.', price: null, priceOnRequest: true, icon: '🔗' }
];

try {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const item of products) {
    await Product.updateOne({ name: item.name }, { $setOnInsert: item }, { upsert: true });
  }
  console.log(`Catálogo cargado/verificado: ${products.length} productos.`);
} finally {
  await mongoose.disconnect();
}
