import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  price: { type: Number, min: 0, default: null },
  priceOnRequest: { type: Boolean, default: false },
  icon: { type: String, default: '🔧', maxlength: 8 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
