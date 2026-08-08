import mongoose from 'mongoose';

const ChatConversationSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, index: true },
  bookingMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, default: '' },
  providerId: { type: String, required: true, index: true },
  providerName: { type: String, required: true },
  serviceType: { type: String, required: true },
  category: { type: String, default: '' },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessageSenderRole: { type: String, enum: ['customer', 'provider', 'system', 'admin'], default: 'system' },
  customerUnreadCount: { type: Number, default: 0 },
  providerUnreadCount: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed', 'archived'], default: 'open' },
  warrantyChatExpiresAt: { type: Date, default: null },
  isReadOnly: { type: Boolean, default: false },
  closedReason: { type: String, default: '' }
}, {
  timestamps: true
});

ChatConversationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ChatConversation', ChatConversationSchema);
