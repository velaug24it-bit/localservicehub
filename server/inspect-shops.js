import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

const PartnerShopSchema = new mongoose.Schema({}, { strict: false });
const PartnerShop = mongoose.model('PartnerShop', PartnerShopSchema);

const ShopInventorySchema = new mongoose.Schema({}, { strict: false });
const ShopInventory = mongoose.model('ShopInventory', ShopInventorySchema);

mongoose.connect(MONGODB_URI).then(async () => {
  const shops = await PartnerShop.find();

  console.log('--- ALL SHOPS ---');

  shops.forEach(s => {
    console.log(
      `ID: ${s._id}, Name: ${s.name}, Location: ${s.location}, Lat: ${s.gpsLocation?.latitude}, Lng: ${s.gpsLocation?.longitude}`
    );
  });

  const inventories = await ShopInventory.find().populate('shopId');

  console.log('\n--- INVENTORIES ---');

  inventories.forEach(i => {
    console.log(
      `Inventory ID: ${i._id}, Shop Name: ${i.shopId?.name}, Shop Location: ${i.shopId?.location}, Product ID: ${i.productId}`
    );
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});