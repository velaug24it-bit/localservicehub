import mongoose from 'mongoose';

const MarketplaceOrderSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  customerId: { type: String, required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerShop', required: true },
  shopName: { type: String, required: true },
  products: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    brandName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalUnitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  deliveryMethod: { type: String, enum: ['Pickup', 'Delivery'], default: 'Pickup' },
  orderStatus: { type: String, enum: ['Placed', 'Preparing', 'ReadyForPickup', 'PickedUp', 'OutForDelivery', 'Delivered', 'Cancelled'], default: 'Placed' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
  pickupQrCode: { type: String, default: '' }
}, {
  timestamps: true
});

MarketplaceOrderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('MarketplaceOrder', MarketplaceOrderSchema);
