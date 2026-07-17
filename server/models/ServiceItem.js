import mongoose from 'mongoose';

const ServiceItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  categoryKey: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  unit: { type: String, default: 'unit', trim: true }, // e.g. "unit", "sq ft", "room", "point"
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

// compound index: unique item key per category
ServiceItemSchema.index({ categoryId: 1, key: 1 }, { unique: true });

ServiceItemSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ServiceItem', ServiceItemSchema);
