import mongoose from 'mongoose';

const ProviderCertificateSchema = new mongoose.Schema({
  certificateNumber: { type: String, required: true, unique: true },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  courseId: { type: String, required: true },
  courseTitle: { type: String, required: true },
  category: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  score: { type: Number, default: 95 },
  status: { type: String, enum: ['Active', 'Expired', 'Revoked'], default: 'Active' },
  verificationUrl: { type: String, default: '' }
}, {
  timestamps: true
});

ProviderCertificateSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ProviderCertificate', ProviderCertificateSchema);
