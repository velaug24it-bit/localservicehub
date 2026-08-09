import mongoose from 'mongoose';

const GrowthGoalSchema = new mongoose.Schema({
  providerId: { type: String, required: true, index: true },
  monthlyRevenueTarget: { type: Number, default: 0 },
  monthlyBookingTarget: { type: Number, default: 0 },
  ratingTarget: { type: Number, default: 0 },
  repeatCustomerTarget: { type: Number, default: 0 },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true }
}, {
  timestamps: true
});

GrowthGoalSchema.index({ providerId: 1, month: 1, year: 1 }, { unique: true });

GrowthGoalSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('GrowthGoal', GrowthGoalSchema);
