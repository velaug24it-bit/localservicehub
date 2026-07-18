import mongoose from 'mongoose';

// Sub-schema for individual service line items (new dynamic pricing)
const ServiceLineItemSchema = new mongoose.Schema({
  serviceItemId:   { type: String, default: '' },
  serviceItemName: { type: String, default: '' },
  workTypeId:      { type: String, default: '' },
  workTypeName:    { type: String, default: '' },
  quantity:        { type: Number, default: 1 },
  unitPrice:       { type: Number, default: 0 },
  subtotal:        { type: Number, default: 0 },
  estimatedDuration: { type: Number, default: 0 } // minutes per unit
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  trackingId: { type: String, required: true },
  userId: { type: String, required: true },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  serviceType: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  description: { type: String, default: '' },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: String, required: true },
  status: { type: String, default: 'Confirmed' },
  currentStep: { type: Number, default: 0 },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  advanceTransactionId: { type: String, default: '' },
  paymentStatus: { type: String, default: 'Unpaid', enum: ['Unpaid', 'Paid'] },
  materialsPaymentStatus: { type: String, default: 'Unpaid', enum: ['Unpaid', 'Paid'] },
  providerUpiId: { type: String, default: '' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  // ── Dynamic Pricing Extension (optional — null for legacy bookings) ──────
  serviceItems: { type: [ServiceLineItemSchema], default: undefined },
  materialsRequired: { type: Boolean, default: false },
  marketplaceOrderId: { type: String, default: null },
  materialsTotal: { type: Number, default: 0 },
  priceBreakdown: {
    type: {
      subtotal:           { type: Number, default: 0 },
      bookingFee:         { type: Number, default: 50 },
      platformFee:        { type: Number, default: 0 },
      taxes:              { type: Number, default: 0 },
      materialsTotal:     { type: Number, default: 0 },
      grandTotal:         { type: Number, default: 0 },
      providerEarnings:   { type: Number, default: 0 },
      platformCommission: { type: Number, default: 0 }
    },
    default: undefined
  }
}, {
  timestamps: true
});

BookingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Booking', BookingSchema);
