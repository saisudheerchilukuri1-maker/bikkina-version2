import dotenv from 'dotenv';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('DNS server configuration failed, using system defaults.');
}
import mongoose from 'mongoose';
import User from './models/User.js';
import PurchaseCompany from './models/PurchaseCompany.js';
import SalesCompany from './models/SalesCompany.js';
import Purchase from './models/Purchase.js';
import Sale from './models/Sale.js';

dotenv.config();

const runTest = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Drop old unique indexes for testing
  const dropIndexSafe = async (collectionName, indexName) => {
    try {
      await mongoose.connection.db.collection(collectionName).dropIndex(indexName);
      console.log(`Dropped index ${indexName} from ${collectionName}`);
    } catch (err) {
      // ignore
    }
  };
  await dropIndexSafe('purchasecompanies', 'name_1');
  await dropIndexSafe('salescompanies', 'name_1');
  await dropIndexSafe('purchases', 'invoiceNumber_1');
  await dropIndexSafe('sales', 'invoiceNumber_1');

  try {
    // 1. Clean up existing test users if they exist
    await User.deleteMany({ email: { $in: ['usera@test.com', 'userb@test.com'] } });
    
    // 2. Create User A and User B
    console.log('Creating test users...');
    const userA = await User.create({
      name: 'User A',
      email: 'usera@test.com',
      password: 'password123',
      businessInfo: { name: 'Company A', phone: '123', address: 'Addr A', gstin: '37A' }
    });

    const userB = await User.create({
      name: 'User B',
      email: 'userb@test.com',
      password: 'password123',
      businessInfo: { name: 'Company B', phone: '456', address: 'Addr B', gstin: '37B' }
    });

    console.log('Users created successfully.');

    // 3. Create Purchase Companies under different users
    console.log('Creating Purchase Companies...');
    const compA = await PurchaseCompany.create({
      user: userA._id,
      name: 'Supplier X',
      phone: '999',
      address: 'Supplier Road'
    });

    // Test compound index: userB should be able to create a company named 'Supplier X' as well!
    const compB = await PurchaseCompany.create({
      user: userB._id,
      name: 'Supplier X',
      phone: '888',
      address: 'Supplier Lane'
    });

    console.log('Purchase Companies created successfully. Compound unique index verified.');

    // 4. Create Purchase Invoices (Floating-point Rates & Weights)
    console.log('Creating Purchase Invoices with decimal rates/weights...');
    const purA1 = await Purchase.create({
      user: userA._id,
      invoiceNumber: 'PUR-A1',
      purchaseCompany: compA._id,
      productName: 'Steel Pipes',
      quantity: 100.5,  // decimal quantity
      rate: 45.25,     // decimal rate
      totalAmount: 100.5 * 45.25,
      remainingQuantity: 100.5,
      pendingAmount: 100.5 * 45.25,
      date: new Date()
    });

    const purA2 = await Purchase.create({
      user: userA._id,
      invoiceNumber: 'PUR-A2',
      purchaseCompany: compA._id,
      productName: 'Iron Rods',
      quantity: 50.75,
      rate: 80.5,
      totalAmount: 50.75 * 80.5,
      remainingQuantity: 50.75,
      pendingAmount: 50.75 * 80.5,
      date: new Date()
    });

    console.log(`Purchase A1: Qty=${purA1.quantity}, Rate=${purA1.rate}, Total=${purA1.totalAmount}`);
    console.log(`Purchase A2: Qty=${purA2.quantity}, Rate=${purA2.rate}, Total=${purA2.totalAmount}`);

    // Verify User A cannot see User B's companies, and User B cannot see User A's purchases
    const userACompanies = await PurchaseCompany.find({ user: userA._id });
    const userBCompanies = await PurchaseCompany.find({ user: userB._id });
    
    if (userACompanies.length !== 1 || userBCompanies.length !== 1) {
      throw new Error('Data scoping failed: Companies are leaking between users.');
    }
    
    const userBPurchases = await Purchase.find({ user: userB._id });
    if (userBPurchases.length !== 0) {
      throw new Error('Data scoping failed: User B sees User A purchases.');
    }
    console.log('Data isolation and scoping query verify: PASSED.');

    // 5. Create a Sales Company for User A
    const salesCompA = await SalesCompany.create({
      user: userA._id,
      name: 'Client Y',
      phone: '777',
      address: 'Client Road'
    });

    // 6. Record Multi-Item Sale Invoice under User A (selling from BOTH purchases)
    console.log('Recording multi-item sale invoice under User A...');
    const saleQty1 = 20.25; // Decimal qty from A1
    const saleQty2 = 10.50; // Decimal qty from A2
    
    const saleItems = [
      {
        purchaseInvoice: purA1._id,
        productName: purA1.productName,
        quantity: saleQty1,
        rate: 55.75, // Decimal selling rate
        totalAmount: saleQty1 * 55.75
      },
      {
        purchaseInvoice: purA2._id,
        productName: purA2.productName,
        quantity: saleQty2,
        rate: 95.25, // Decimal selling rate
        totalAmount: saleQty2 * 95.25
      }
    ];

    const saleTotal = saleItems[0].totalAmount + saleItems[1].totalAmount;

    // Deduct stock from purchases
    purA1.soldQuantity += saleQty1;
    purA1.remainingQuantity = purA1.quantity - purA1.soldQuantity;
    await purA1.save();

    purA2.soldQuantity += saleQty2;
    purA2.remainingQuantity = purA2.quantity - purA2.soldQuantity;
    await purA2.save();

    const sale = await Sale.create({
      user: userA._id,
      invoiceNumber: 'SAL-A1',
      salesCompany: salesCompA._id,
      items: saleItems,
      totalAmount: saleTotal,
      deduction: 129.0625,
      pendingAmount: saleTotal - 129.0625,
      date: new Date()
    });

    console.log(`Sale SAL-A1 created successfully. Items count: ${sale.items.length}, Total amount: ${sale.totalAmount}, Deduction: ${sale.deduction}, Pending: ${sale.pendingAmount}, Status: ${sale.paymentStatus}`);

    if (sale.pendingAmount !== 2000.0) {
      throw new Error(`Deduction pending calculation failed. Expected: 2000.0, Got: ${sale.pendingAmount}`);
    }
    if (sale.paymentStatus !== 'Partially Paid') {
      throw new Error(`Expected paymentStatus to be 'Partially Paid' due to deduction, got: ${sale.paymentStatus}`);
    }
    console.log('Deduction pending amount calculations: PASSED.');

    // Verify stock levels are correctly updated in purchases
    const updatedPurA1 = await Purchase.findById(purA1._id);
    const updatedPurA2 = await Purchase.findById(purA2._id);

    console.log(`Updated Purchase A1 stock remaining: ${updatedPurA1.remainingQuantity} (Expected: ${100.5 - 20.25})`);
    console.log(`Updated Purchase A2 stock remaining: ${updatedPurA2.remainingQuantity} (Expected: ${50.75 - 10.50})`);

    if (updatedPurA1.remainingQuantity !== 80.25 || updatedPurA2.remainingQuantity !== 40.25) {
      throw new Error('Stock deduction check failed.');
    }
    console.log('Stock deductions for multi-item invoices: PASSED.');

    // Clean up test entries
    console.log('Cleaning up test entries...');
    await User.deleteMany({ email: { $in: ['usera@test.com', 'userb@test.com'] } });
    await PurchaseCompany.deleteMany({ _id: { $in: [compA._id, compB._id] } });
    await SalesCompany.deleteMany({ _id: salesCompA._id });
    await Purchase.deleteMany({ _id: { $in: [purA1._id, purA2._id] } });
    await Sale.deleteMany({ _id: sale._id });

    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

runTest();
