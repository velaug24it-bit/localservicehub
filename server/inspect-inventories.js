import mongoose from 'mongoose';
import PartnerShop from './models/PartnerShop.js';
import ShopInventory from './models/ShopInventory.js';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://velr012006_db_user:vel2006raj@cluster0.uxiis7h.mongodb.net/servicehub?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI).then(async () => {
  const inventories = await ShopInventory.find().populate('shopId').populate('productId');
  console.log('--- ALL INVENTORY LISTINGS ---');
  inventories.forEach(i => {
    console.log(`Listing ID: ${i._id}`);
    console.log(`  Shop Name: ${i.shopId?.name}, Location: ${i.shopId?.location}`);
    console.log(`  Product Name: ${i.productId?.name}, Brand: ${i.productId?.brandName}`);
    console.log(`  Price: ${i.price}, Stock: ${i.stock}, Active: ${i.isActive}`);
  });

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
