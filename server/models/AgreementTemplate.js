import mongoose from 'mongoose';

const AgreementTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serviceCategory: { type: String, default: '' },
  durationMonths: { type: Number, default: 12 },
  terms: { type: String, default: '' },
  coveredServices: { type: [String], default: [] },
  excludedServices: { type: [String], default: [] },
  warrantyRules: { type: String, default: '' },
  cancellationRules: { type: String, default: '' },
  renewalRules: { type: String, default: '' },
  customerObligations: { type: String, default: '' },
  providerObligations: { type: String, default: '' },
  platformRole: { type: String, default: '' },
  paymentModel: { 
    type: String, 
    enum: ['covered', 'additional_charge', 'inspection_fee', 'material_charge'], 
    default: 'additional_charge' 
  },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  isDefault: { type: Boolean, default: false }
}, {
  timestamps: true
});

AgreementTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AgreementTemplate', AgreementTemplateSchema);
