import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  link: { type: String, default: null },
  bookingId: { type: String, default: null },
  read: { type: Boolean, default: false }
}, {
  timestamps: true
});

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Notification', NotificationSchema);
