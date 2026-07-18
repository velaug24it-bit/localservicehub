import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  invoiceType: { type: String, enum: ['provider', 'material', 'servicehub'], required: true },
  recipientId: { type: String, required: true }, // User ID (or shop ID / provider ID)
  senderId: { type: String, required: true },    // Provider ID, Shop ID, or 'servicehub'
  details: { type: mongoose.Schema.Types.Mixed, required: true },
  amount: { type: Number, required: true }
}, {
  timestamps: true
});

InvoiceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Invoice', InvoiceSchema);
