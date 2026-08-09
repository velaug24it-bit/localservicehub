import mongoose from 'mongoose';

const WarrantyClaimSchema = new mongoose.Schema({
  id: { type: String, required: true },
  claimDate: { type: Date, default: Date.now },
  issueDescription: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Specialist Assigned', 'Resolved', 'Rejected'], 
    default: 'Pending' 
  },
  resolutionNotes: { type: String, default: '' },
  assignedProviderId: { type: String, default: '' },
  assignedProviderName: { type: String, default: '' }
}, { _id: false });

const WarrantySchema = new mongoose.Schema({
  warrantyNumber: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  trackingId: { type: String, required: true },
  userId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  serviceName: { type: String, required: true },
  category: { type: String, required: true },
  serviceAmount: { type: Number, default: 500 },
  startDate: { type: Date, default: Date.now },
  durationDays: { type: Number, default: 90 }, // Standard 90 days protection
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Claimed', 'Expired', 'Fulfilled', 'Claimed & Resolved'], default: 'Active' },
  isUsed: { type: Boolean, default: false },
  coverageTerms: { 
    type: String, 
    default: '100% Free rework on workmanship defects, leakage warranty, and certified spare part performance.' 
  },
  claims: { type: [WarrantyClaimSchema], default: [] }
}, {
  timestamps: true
});

WarrantySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Warranty', WarrantySchema);
