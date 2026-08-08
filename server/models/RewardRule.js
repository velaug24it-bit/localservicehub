import mongoose from 'mongoose';

const RewardRuleSchema = new mongoose.Schema({
  pointsPerHundredRupees: { type: Number, default: 5 }, // 5 points per ₹100 spent
  redemptionRate: { type: Number, default: 1 }, // 1 point = ₹1
  welcomeBonusPoints: { type: Number, default: 100 },
  referralBonusRupees: { type: Number, default: 150 },
  emergencySurcharge: { type: Number, default: 150 },
  activeCampaignName: { type: String, default: 'Monsoon Service Rewards Festival' },
  activeCampaignMultiplier: { type: Number, default: 1.5 }
}, {
  timestamps: true
});

RewardRuleSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('RewardRule', RewardRuleSchema);
