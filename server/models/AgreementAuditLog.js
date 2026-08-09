import mongoose from 'mongoose';

const AgreementAuditLogSchema = new mongoose.Schema({
  agreementId: { type: String, default: '', index: true },
  serviceRequestId: { type: String, default: '' },
  action: {
    type: String,
    enum: ['created', 'signed', 'assigned', 'accepted', 'declined', 'completed', 'cancelled', 'expired', 'status_change'],
    required: true
  },
  performedBy: { type: String, required: true },
  performedByRole: { type: String, enum: ['customer', 'provider', 'admin', 'system'], required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

AgreementAuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AgreementAuditLog', AgreementAuditLogSchema);
