import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import PartnerShop from './models/PartnerShop.js';
import ShopInventory from './models/ShopInventory.js';
import Product from './models/Product.js';

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const inventories = await ShopInventory.find()
    .populate('shopId')
    .populate('productId');

  console.log('--- ALL INVENTORY LISTINGS ---');

  inventories.forEach(i => {
    console.log(`Listing ID: ${i._id}`);
    console.log(`  Shop Name: ${i.shopId?.name}, Location: ${i.shopId?.location}`);
    console.log(`  Product Name: ${i.productId?.name}, Brand: ${i.productId?.brandName}`);
    console.log(`  Price: ${i.price}, Stock: ${i.stock}, Active: ${i.isActive}`);
  });

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});