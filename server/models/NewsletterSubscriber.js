import mongoose from 'mongoose';

const NewsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
}, {
  timestamps: true
});

NewsletterSubscriberSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('NewsletterSubscriber', NewsletterSubscriberSchema);
