import mongoose from 'mongoose';

const CustomerMembershipSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  customerName: { type: String, default: '' },
  customerEmail: { type: String, default: '' },
  planType: { 
    type: String, 
    enum: ['free', 'silver', 'gold', 'platinum'], 
    default: 'free' 
  },
  planName: { type: String, default: 'ServiceHub Free Shield' },
  discountPercent: { type: Number, default: 0 },
  warrantyDaysMultiplier: { type: Number, default: 1 }, // e.g. 2x warranty duration
  priorityBooking: { type: Boolean, default: false },
  freeEmergencyDispatch: { type: Boolean, default: false },
  vipSupport: { type: Boolean, default: false },
  amountPaid: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }, // Null for free, 6/12 months for paid
  isActive: { type: Boolean, default: true },
  benefits: { type: [String], default: ['Standard 90-Day Warranty', 'Verified Provider Network', 'Split Invoice Downloads'] }
}, {
  timestamps: true
});

CustomerMembershipSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('CustomerMembership', CustomerMembershipSchema);
