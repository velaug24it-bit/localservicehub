import mongoose from 'mongoose';

const PartnerShopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  location: { type: String, default: 'Chennai' }, // District or Area
  gpsLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  gst: { type: String, default: '' },
  businessHours: { type: String, default: '09:00 AM - 08:00 PM' },
  deliveryAvailable: { type: Boolean, default: true },
  pickupAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 },
  status: { type: String, enum: ['Pending', 'Verified', 'Suspended'], default: 'Verified' }
}, {
  timestamps: true
});

PartnerShopSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('PartnerShop', PartnerShopSchema);
