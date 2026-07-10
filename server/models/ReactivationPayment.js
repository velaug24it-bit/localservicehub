import mongoose from 'mongoose';

const ReactivationPaymentSchema = new mongoose.Schema({
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  providerEmail: { type: String, default: '' },
  cycleEarnings: { type: Number, default: 0 },    // Total earnings in the billing cycle
  amountDue: { type: Number, default: 0 },         // 10% commission or 0
  amountPaid: { type: Number, default: 0 },         // Actual amount paid (same as amountDue)
  paymentType: {
    type: String,
    enum: ['free', 'razorpay', 'mock'],
    default: 'free'
  },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  status: { type: String, enum: ['success', 'pending', 'failed'], default: 'success' },
  previousActivationDate: { type: Date, default: null },
  newActivationDate: { type: Date, default: Date.now }
}, { timestamps: true });

ReactivationPaymentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ReactivationPayment', ReactivationPaymentSchema);
