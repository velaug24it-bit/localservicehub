import mongoose from 'mongoose';

const AiMatchLogSchema = new mongoose.Schema({
  userId: { type: String, default: null },         // null for unauthenticated guests
  category: { type: String, default: '' },
  location: { type: String, default: '' },
  severity: { type: String, default: '' },
  suggestedServices: { type: [String], default: [] },
  source: { type: String, enum: ['ai', 'local'], default: 'local' },
  totalProvidersFound: { type: Number, default: 0 },
  matches: [
    {
      providerId: { type: String, default: '' },
      providerName: { type: String, default: '' },
      score: { type: Number, default: 0 },
      reason: { type: String, default: '' }
    }
  ]
}, { timestamps: true });

AiMatchLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AiMatchLog', AiMatchLogSchema);
