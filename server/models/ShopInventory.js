import mongoose from 'mongoose';

const ShopInventorySchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerShop', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 }, // percentage discount, e.g. 10%
  stock: { type: Number, default: 10, min: 0 },
  estimatedDeliveryHours: { type: Number, default: 24 },
  deliveryCharge: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

ShopInventorySchema.index({ shopId: 1, productId: 1 }, { unique: true });

ShopInventorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('ShopInventory', ShopInventorySchema);
