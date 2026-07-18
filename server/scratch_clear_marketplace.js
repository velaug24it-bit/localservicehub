import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/servicehub";

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB.");
    
    // Clear marketplace collections
    const collectionsToDrop = ['partnershops', 'brands', 'products', 'shopinventories'];
    
    for (const colName of collectionsToDrop) {
      try {
        await mongoose.connection.db.collection(colName).deleteMany({});
        console.log(`Cleared all documents from "${colName}" collection.`);
      } catch (err) {
        console.log(`Failed/skipped clearing "${colName}":`, err.message);
      }
    }
    
    console.log("Marketplace tables cleared. Restarting the server will trigger fresh seeding.");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
