import mongoose from 'mongoose';

const AiDiagnosisSchema = new mongoose.Schema({
  userId: { type: String, default: null },         // null for unauthenticated guests
  description: { type: String, default: '' },
  imageProvided: { type: Boolean, default: false },
  source: { type: String, enum: ['ai', 'heuristic'], default: 'heuristic' },
  result: {
    problem: { type: String, default: '' },
    category: { type: String, default: '' },
    severity: { type: String, default: '' },
    description: { type: String, default: '' },
    suggestedServices: { type: [String], default: [] },
    estimatedCost: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 }
    },
    urgency: { type: String, default: '' },
    tips: { type: [String], default: [] }
  }
}, { timestamps: true });

AiDiagnosisSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('AiDiagnosis', AiDiagnosisSchema);
