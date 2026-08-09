import mongoose from 'mongoose';

const AgreementServiceRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  agreementId: { type: String, required: true, index: true },
  originalBookingId: { type: String, required: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: '' },
  assignedProviderId: { type: String, default: '', index: true },
  assignedProviderName: { type: String, default: '' },
  originalProviderId: { type: String, default: '' },
  originalProviderName: { type: String, default: '' },
  serviceType: { type: String, required: true },
  category: { type: String, default: '' },
  location: { type: String, default: '' },
  description: { type: String, required: true },
  attachments: { type: [String], default: [] }, // base64 photo strings
  status: {
    type: String,
    enum: [
      'PENDING_ADMIN_ASSIGNMENT',
      'PROVIDER_ASSIGNED',
      'PROVIDER_ACCEPTED',
      'PROVIDER_DECLINED',
      'SERVICE_SCHEDULED',
      'SERVICE_IN_PROGRESS',
      'SERVICE_COMPLETED',
      'CUSTOMER_CONFIRMED',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'PENDING_ADMIN_ASSIGNMENT'
  },
  adminNotes: { type: String, default: '' },
  providerNotes: { type: String, default: '' },
  paymentRequired: { type: Boolean, default: true },
  paymentAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'waived'], default: 'unpaid' },
  chatConversationId: { type: String, default: '' },
  assignedAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true
});

AgreementServiceRequestSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AgreementServiceRequest', AgreementServiceRequestSchema);
