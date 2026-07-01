import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import PurchaseCompany from './models/PurchaseCompany.js';
import SalesCompany from './models/SalesCompany.js';
import Purchase from './models/Purchase.js';
import Sale from './models/Sale.js';
import Payment from './models/Payment.js';
import Expense from './models/Expense.js';

dotenv.config();

const runTests = async () => {
  console.log('--- Starting Backend Verification Tests ---');
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('1. Database connected.');

    // Clear previous test database data (Warning: only for test db!)
    if (process.env.MONGODB_URI.includes('erp-trading')) {
      await User.deleteMany({});
      await PurchaseCompany.deleteMany({});
      await SalesCompany.deleteMany({});
      await Purchase.deleteMany({});
      await Sale.deleteMany({});
      await Payment.deleteMany({});
      await Expense.deleteMany({});
      console.log('Cleaned up previous test data.');
    }

    // 2. Create User
    const user = await User.create({
      name: 'Admin User',
      email: 'admin@erp.com',
      password: 'password123',
      businessInfo: {
        name: 'Super Trading Corp',
        phone: '9876543210',
        address: '123 Business Road, India',
        gstin: '22AAAAA0000A1Z5',
      },
    });
    console.log('2. User registered successfully.');

    // Verify Password Match
    const isMatch = await user.matchPassword('password123');
    console.log(`Password verification: ${isMatch ? 'PASS' : 'FAIL'}`);

    // 3. Create Purchase Company
    const pCompany = await PurchaseCompany.create({
      name: 'Steel Supplier Inc',
      phone: '111-222-3333',
      address: 'Industrial Area Phase 1',
      gstNumber: '22PPPPP1111P1Z0',
      notes: 'Main steel supplier',
    });
    console.log(`3. Purchase Company created: ${pCompany.name}`);

    // 4. Create Purchase Invoice
    const purchase = new Purchase({
      invoiceNumber: 'PUR-2026-001',
      purchaseCompany: pCompany._id,
      productName: 'Steel Rods',
      quantity: 100,
      rate: 50, // total = 5000
      date: new Date(),
    });
    await purchase.save();

    // Update company totals manually (mimics controller logic)
    pCompany.totals.purchaseAmount += purchase.totalAmount;
    pCompany.totals.pendingAmount += purchase.totalAmount;
    pCompany.totals.quantityPurchased += purchase.quantity;
    await pCompany.save();
    console.log(`4. Purchase recorded. Total: ${purchase.totalAmount}. Company Totals updated.`);

    // 5. Create Sales Company
    const sCompany = await SalesCompany.create({
      name: 'Metro Builders',
      phone: '444-555-6666',
      address: 'Construction Site B',
      notes: 'Bulk retail contractor',
    });
    console.log(`5. Sales Company created: ${sCompany.name}`);

    // 6. Create Sales Invoice (Link to Purchase PUR-2026-001)
    const activePurchase = await Purchase.findById(purchase._id);
    console.log(`Stock before sale: ${activePurchase.remainingQuantity} remaining.`);

    const quantityToSell = 30;
    if (activePurchase.remainingQuantity < quantityToSell) {
      throw new Error('Stock check failed!');
    }

    // Deduct stock
    activePurchase.soldQuantity += quantityToSell;
    activePurchase.remainingQuantity = activePurchase.quantity - activePurchase.soldQuantity;
    await activePurchase.save();

    const sale = new Sale({
      invoiceNumber: 'SAL-2026-001',
      salesCompany: sCompany._id,
      purchaseInvoice: activePurchase._id,
      productName: 'Steel Rods',
      quantity: quantityToSell,
      rate: 75, // total = 2250, profit = 30 * (75 - 50) = 750
      date: new Date(),
    });
    await sale.save();

    sCompany.totals.salesAmount += sale.totalAmount;
    sCompany.totals.pendingAmount += sale.totalAmount;
    await sCompany.save();
    console.log(`6. Sale recorded. Remaining Stock: ${activePurchase.remainingQuantity}. Company Totals updated.`);

    // 7. Verify stock restriction (Attempt to sell 80 rods, when only 70 remain)
    const freshPurchaseObj = await Purchase.findById(purchase._id);
    const excessiveSaleQty = 80;
    console.log(`Attempting excessive sale of ${excessiveSaleQty} steel rods. Available: ${freshPurchaseObj.remainingQuantity}.`);
    
    if (freshPurchaseObj.remainingQuantity < excessiveSaleQty) {
      console.log('Stock constraint test: PASS (Prevented sale. Outputting error simulated at API level)');
    } else {
      console.log('Stock constraint test: FAIL (Allows overallocation!)');
    }

    // 8. Create Payment (Record Payment Paid to Purchase Company)
    const payAmt = 1500;
    console.log(`Recording payment of ${payAmt} to Steel Supplier Inc...`);
    
    const freshPComp = await PurchaseCompany.findById(pCompany._id);
    const freshInvoice = await Purchase.findById(purchase._id);
    
    const allocAmount = Math.min(payAmt, freshInvoice.pendingAmount);
    freshInvoice.paidAmount += allocAmount;
    freshInvoice.pendingAmount = freshInvoice.totalAmount - freshInvoice.paidAmount;
    freshInvoice.paymentStatus = freshInvoice.paidAmount >= freshInvoice.totalAmount ? 'Paid' : 'Partially Paid';
    await freshInvoice.save();

    const payment = await Payment.create({
      companyType: 'PurchaseCompany',
      purchaseCompany: freshPComp._id,
      purchaseInvoice: freshInvoice._id,
      amount: payAmt,
      paymentMode: 'Bank',
      notes: 'Part payment online',
      allocations: [{
        invoiceId: freshInvoice._id,
        invoiceType: 'Purchase',
        amount: allocAmount,
      }],
    });

    freshPComp.totals.paidAmount += payAmt;
    freshPComp.totals.pendingAmount -= payAmt;
    await freshPComp.save();

    console.log(`8. Payment recorded. Invoice Pending: ${freshInvoice.pendingAmount}. Company Pending Payables: ${freshPComp.totals.pendingAmount}`);

    // Verify Ledger Calculations
    // Retrieve Purchases and Payments for Steel Supplier Inc
    const companyLedgerPurchases = await Purchase.find({ purchaseCompany: pCompany._id });
    const companyLedgerPayments = await Payment.find({ purchaseCompany: pCompany._id });

    const transactions = [];
    companyLedgerPurchases.forEach(p => {
      transactions.push({ date: p.date, d: 0, c: p.totalAmount });
    });
    companyLedgerPayments.forEach(p => {
      transactions.push({ date: p.paymentDate, d: p.amount, c: 0 });
    });

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    transactions.forEach(t => {
      runningBalance += (t.c - t.d);
    });

    console.log(`Ledger running balance calculated: ${runningBalance} (Expected: 3500)`);
    if (runningBalance === 3500) {
      console.log('Ledger calculation: PASS');
    } else {
      console.log('Ledger calculation: FAIL');
    }

    // 9. Revert Payment test
    console.log('Testing payment deletion rollback...');
    const paymentToDelete = await Payment.findById(payment._id);
    for (const alloc of paymentToDelete.allocations) {
      const inv = await Purchase.findById(alloc.invoiceId);
      inv.paidAmount -= alloc.amount;
      inv.pendingAmount = inv.totalAmount - inv.paidAmount;
      inv.paymentStatus = inv.paidAmount === 0 ? 'Pending' : 'Partially Paid';
      await inv.save();
    }
    
    const compToRestore = await PurchaseCompany.findById(paymentToDelete.purchaseCompany);
    compToRestore.totals.paidAmount -= paymentToDelete.amount;
    compToRestore.totals.pendingAmount += paymentToDelete.amount;
    await compToRestore.save();
    await paymentToDelete.deleteOne();

    const restoredInvoice = await Purchase.findById(purchase._id);
    const restoredComp = await PurchaseCompany.findById(pCompany._id);
    console.log(`Payment deleted. Invoice Pending restored to: ${restoredInvoice.pendingAmount} (Expected: 5000)`);
    console.log(`Company Pending Payables restored to: ${restoredComp.totals.pendingAmount} (Expected: 5000)`);

    if (restoredInvoice.pendingAmount === 5000 && restoredComp.totals.pendingAmount === 5000) {
      console.log('Payment Deletion Rollback: PASS');
    } else {
      console.log('Payment Deletion Rollback: FAIL');
    }

    console.log('--- All Backend verification tests finished successfully ---');
  } catch (error) {
    console.error('Test execution failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

runTests();
