import mongoose from 'mongoose';

const WorkTypeSchema = new mongoose.Schema({
  serviceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
  categoryKey: { type: String, required: true, lowercase: true, trim: true },
  itemKey: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  estimatedDuration: { type: Number, default: 60 }, // minutes
  defaultPrice: { type: Number, default: 0 }, // fallback price if provider hasn't set one
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

// compound index: unique work type key per service item
WorkTypeSchema.index({ serviceItemId: 1, key: 1 }, { unique: true });

WorkTypeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('WorkType', WorkTypeSchema);
