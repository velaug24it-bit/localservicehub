import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/servicehub";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB.");
    
    // Get collections
    const collections = Object.keys(mongoose.connection.collections);
    console.log("Collections:", collections);
    
    for (const colName of collections) {
      const count = await mongoose.connection.collections[colName].countDocuments();
      console.log(`- Collection "${colName}" has ${count} documents.`);
    }
    
    // Let's inspect categories
    const categories = await mongoose.connection.db.collection('servicecategories').find().toArray();
    console.log("\nCategories in Database:");
    categories.forEach(c => console.log(`  - Key: "${c.key}", Name: "${c.name}"`));
    
    // Let's inspect partner shops
    const shops = await mongoose.connection.db.collection('partnershops').find().toArray();
    console.log("\nPartner Shops in Database (first 5):");
    shops.slice(0, 5).forEach(s => console.log(`  - Name: "${s.name}", Location: "${s.location}", Status: "${s.status}"`));
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
