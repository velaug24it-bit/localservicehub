import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  location: { type: String, default: 'Chennai' },
  userType: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  password: { type: String, required: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, default: '' },
  services: { type: Array, default: [] }, // array of { name: string, price: string }
  availability: { type: mongoose.Schema.Types.Mixed, default: null },
  serviceAreas: { type: [String], default: [] },
  upiId: { type: String, default: '' },
  approved: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastActivationDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

export default mongoose.model('User', UserSchema);
