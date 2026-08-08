import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
  bookingId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  senderRole: { type: String, enum: ['customer', 'provider', 'system', 'admin'], required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  mediaUrl: { type: String, default: '' },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null }
}, {
  timestamps: true
});

ChatMessageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ChatMessage', ChatMessageSchema);
