import mongoose from 'mongoose';

const ProviderPayoutRequestSchema = new mongoose.Schema({
  id: { type: String, required: true },
  amount: { type: Number, required: true },
  upiId: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Transferred', 'Rejected'], default: 'Pending' },
  requestDate: { type: Date, default: Date.now },
  processedDate: { type: Date, default: null },
  referenceId: { type: String, default: '' },
  adminNotes: { type: String, default: '' }
}, { _id: false });

const ProviderTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['booking_earning', 'referral_bonus', 'marketplace_cashback', 'performance_reward', 'milestone_bonus', 'top_provider_bonus', 'withdrawal'],
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  bookingId: { type: String, default: null },
  status: { type: String, default: 'Completed' },
  date: { type: Date, default: Date.now }
}, { _id: false });

const ProviderWalletSchema = new mongoose.Schema({
  providerId: { type: String, required: true, unique: true },
  providerName: { type: String, default: '' },
  providerPhone: { type: String, default: '' },
  providerUpiId: { type: String, default: '' },
  availableBalance: { type: Number, default: 0 },
  pendingSettlement: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  totalLifetimeEarnings: { type: Number, default: 0 },
  
  // Work Volume Milestone System (Every ₹100 of completed work = 1 pt; at 100 pts -> ₹1,000 bonus & resets to 0)
  milestonePoints: { type: Number, default: 0 },
  milestoneCyclesCompleted: { type: Number, default: 0 },
  milestoneBonusEarned: { type: Number, default: 0 },
  
  // Top 5 Provider Leaderboard Bonus
  topProviderRank: { type: Number, default: 0 },
  topProviderBonusEarned: { type: Number, default: 0 },

  referralBonusEarned: { type: Number, default: 0 },
  marketplaceCashbackEarned: { type: Number, default: 0 },
  performanceBonusEarned: { type: Number, default: 0 },
  transactions: { type: [ProviderTransactionSchema], default: [] },
  payoutRequests: { type: [ProviderPayoutRequestSchema], default: [] }
}, {
  timestamps: true
});

ProviderWalletSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ProviderWallet', ProviderWalletSchema);
