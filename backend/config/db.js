import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop old single-field unique indexes to allow multi-user compound indexes
    const dropIndexSafe = async (collectionName, indexName) => {
      try {
        await mongoose.connection.db.collection(collectionName).dropIndex(indexName);
        console.log(`Dropped index ${indexName} from ${collectionName}`);
      } catch (err) {
        // Index does not exist or already dropped, ignore
      }
    };

    await dropIndexSafe('purchasecompanies', 'name_1');
    await dropIndexSafe('salescompanies', 'name_1');
    await dropIndexSafe('purchases', 'invoiceNumber_1');
    await dropIndexSafe('sales', 'invoiceNumber_1');
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
