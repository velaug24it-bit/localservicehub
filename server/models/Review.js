import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true }, // one review per booking
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  serviceType: { type: String, default: '' },
  category: { type: String, default: '' }
}, { timestamps: true });

ReviewSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Review', ReviewSchema);
