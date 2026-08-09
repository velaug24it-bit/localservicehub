import mongoose from 'mongoose';

const AgreementSignatureSchema = new mongoose.Schema({
  agreementId: { type: String, required: true, index: true },
  customerId: { type: String, required: true },
  signatureType: { type: String, enum: ['drawn', 'typed'], required: true },
  signatureData: { type: String, required: true }, // base64 canvas data or typed name
  fullName: { type: String, required: true },
  consent: { type: Boolean, required: true, default: false },
  signedAt: { type: Date, default: Date.now },
  auditMetadata: {
    type: {
      userAgent: { type: String, default: '' },
      agreementVersion: { type: Number, default: 1 }
    },
    default: undefined
  }
}, {
  timestamps: true
});

AgreementSignatureSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AgreementSignature', AgreementSignatureSchema);
