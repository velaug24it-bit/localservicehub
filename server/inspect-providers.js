import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

mongoose.connect(MONGODB_URI).then(async () => {
  const providers = await User.find({ role: 'provider' });

  console.log('--- PROVIDERS ---');

  providers.forEach(p => {
    console.log(`ID: ${p._id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Location: ${p.location}`);
    console.log(`Category: ${p.category}`);
    console.log('-----------------------------');
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});