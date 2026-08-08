import mongoose from 'mongoose';

const ProviderLevelSchema = new mongoose.Schema({
  providerId: { type: String, required: true, unique: true },
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], 
    default: 'Bronze' 
  },
  trustScore: { type: Number, default: 92 }, // 0 to 100
  onTimePercentage: { type: Number, default: 98 },
  responseRatePercentage: { type: Number, default: 99 },
  completedJobsCount: { type: Number, default: 0 },
  repeatCustomersCount: { type: Number, default: 0 },
  rating: { type: Number, default: 4.8 },
  verifiedBadge: { type: Boolean, default: true },
  experienceYears: { type: String, default: '5+ Years' },
  leadPriorityMultiplier: { type: Number, default: 1.0 },
  commissionDiscountPercent: { type: Number, default: 0 }, // e.g. 1% discount for Gold, 2% for Platinum
  unlockedPerks: { 
    type: [String], 
    default: ['Verified Badge', 'Client Contact Access', 'Standard Dispatch'] 
  }
}, {
  timestamps: true
});

ProviderLevelSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ProviderLevel', ProviderLevelSchema);
