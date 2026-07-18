import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  brandName: { type: String, required: true, trim: true },
  image: { type: String, default: '📦' },
  description: { type: String, default: '' },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  warranty: { type: String, default: 'No warranty' },
  categoryKey: { type: String, required: true, lowercase: true, trim: true },
  serviceItemKey: { type: String, required: true, lowercase: true, trim: true },
  workTypeKey: { type: String, default: '', lowercase: true, trim: true }, // if empty, matches all work types under item
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

ProductSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Product', ProductSchema);
