import mongoose from 'mongoose';

const ServiceAgreementSchema = new mongoose.Schema({
  agreementId: { type: String, required: true, unique: true, index: true },
  bookingId: { type: String, required: true },
  trackingId: { type: String, default: '' },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  providerId: { type: String, required: true, index: true },
  providerName: { type: String, required: true },
  serviceType: { type: String, required: true },
  category: { type: String, default: '' },
  location: { type: String, default: '' },
  templateId: { type: String, default: '' },
  templateVersion: { type: Number, default: 1 },
  templateSnapshot: {
    type: {
      name: { type: String, default: '' },
      terms: { type: String, default: '' },
      coveredServices: { type: [String], default: [] },
      excludedServices: { type: [String], default: [] },
      warrantyRules: { type: String, default: '' },
      cancellationRules: { type: String, default: '' },
      renewalRules: { type: String, default: '' },
      customerObligations: { type: String, default: '' },
      providerObligations: { type: String, default: '' },
      platformRole: { type: String, default: '' },
      paymentModel: { type: String, default: 'additional_charge' }
    },
    default: undefined
  },
  durationMonths: { type: Number, default: 12 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'REJECTED'],
    default: 'DRAFT'
  },
  signedAt: { type: Date, default: null },
  serviceRequestCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

ServiceAgreementSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ServiceAgreement', ServiceAgreementSchema);
