import mongoose from 'mongoose';

const ProviderPricingSchema = new mongoose.Schema({
  providerId: { type: String, required: true },      // User._id as string
  categoryId: { type: String, required: true },      // ServiceCategory._id as string
  categoryKey: { type: String, required: true },
  categoryName: { type: String, default: '' },
  serviceItemId: { type: String, required: true },   // ServiceItem._id as string
  serviceItemName: { type: String, default: '' },
  serviceItemKey: { type: String, required: true },
  workTypeId: { type: String, required: true },      // WorkType._id as string
  workTypeName: { type: String, default: '' },
  workTypeKey: { type: String, required: true },
  estimatedDuration: { type: Number, default: 60 }, // minutes — copied from WorkType for convenience
  price: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure a provider can only set one price per work-type
ProviderPricingSchema.index({ providerId: 1, workTypeId: 1 }, { unique: true });

// Index for fast lookups
ProviderPricingSchema.index({ providerId: 1, categoryId: 1 });

ProviderPricingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ProviderPricing', ProviderPricingSchema);
