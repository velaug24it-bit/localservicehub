import mongoose from 'mongoose';

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  key: { type: String, required: true, unique: true, lowercase: true, trim: true }
}, {
  timestamps: true
});

BrandSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Brand', BrandSchema);
