import mongoose from 'mongoose';

const WalletTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['cashback', 'reward_redemption', 'referral_bonus', 'promo_credit', 'booking_payment', 'topup', 'withdrawal'],
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  bookingId: { type: String, default: null },
  date: { type: Date, default: Date.now }
}, { _id: false });

const CustomerWalletSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 100 }, // Initial welcome promotional credit (100)
  cashbackBalance: { type: Number, default: 0 },
  promoCredits: { type: Number, default: 100 },
  rewardPoints: { type: Number, default: 100 },
  referralCode: { type: String, default: '' },
  totalEarned: { type: Number, default: 100 },
  totalSpent: { type: Number, default: 0 },
  transactions: { type: [WalletTransactionSchema], default: [] }
}, {
  timestamps: true
});

CustomerWalletSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('CustomerWallet', CustomerWalletSchema);
