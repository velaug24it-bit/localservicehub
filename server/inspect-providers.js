import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://velr012006_db_user:vel2006raj@cluster0.uxiis7h.mongodb.net/servicehub?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

mongoose.connect(MONGODB_URI).then(async () => {
  const providers = await User.find({ role: 'provider' });
  console.log('--- PROVIDERS ---');
  providers.forEach(p => {
    console.log(`ID: ${p._id}, Name: ${p.name}, Location: ${p.location}, Category: ${p.category}`);
  });
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
