import mongoose from 'mongoose';

const SmartPricingLogSchema = new mongoose.Schema({
  userId: { type: String, default: null },         // null for unauthenticated guests
  category: { type: String, default: '' },
  location: { type: String, default: '' },
  serviceType: { type: String, default: '' },
  basePrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalMultiplier: { type: Number, default: 1 },
  surgeLevel: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
  bookingDate: { type: String, default: '' },
  bookingTime: { type: String, default: '' },
  factors: { type: mongoose.Schema.Types.Mixed, default: [] },
  demandStats: {
    recentBookings: { type: Number, default: 0 },
    availableProviders: { type: Number, default: 0 }
  }
}, { timestamps: true });

SmartPricingLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('SmartPricingLog', SmartPricingLogSchema);
