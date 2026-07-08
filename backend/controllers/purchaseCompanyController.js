import PurchaseCompany from '../models/PurchaseCompany.js';
import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';

// @desc    Get all purchase companies
// @route   GET /api/purchase-companies
// @access  Private
export const getPurchaseCompanies = async (req, res, next) => {
  try {
    const companies = await PurchaseCompany.find({ user: req.user._id }).sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a purchase company
// @route   POST /api/purchase-companies
// @access  Private
export const createPurchaseCompany = async (req, res, next) => {
  const { name, phone, address, gstNumber, notes } = req.body;

  try {
    const exists = await PurchaseCompany.findOne({ name, user: req.user._id });
    if (exists) {
      res.status(400);
      throw new Error('Company already exists');
    }

    const company = await PurchaseCompany.create({
      user: req.user._id,
      name,
      phone,
      address,
      gstNumber,
      notes,
    });

    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a purchase company
// @route   PUT /api/purchase-companies/:id
// @access  Private
export const updatePurchaseCompany = async (req, res, next) => {
  const { name, phone, address, gstNumber, notes } = req.body;

  try {
    const company = await PurchaseCompany.findOne({ _id: req.params.id, user: req.user._id });

    if (company) {
      company.name = name || company.name;
      company.phone = phone || company.phone;
      company.address = address || company.address;
      company.gstNumber = gstNumber ?? company.gstNumber;
      company.notes = notes ?? company.notes;

      const updatedCompany = await company.save();
      res.json(updatedCompany);
    } else {
      res.status(404);
      throw new Error('Company not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a purchase company
// @route   DELETE /api/purchase-companies/:id
// @access  Private
export const deletePurchaseCompany = async (req, res, next) => {
  try {
    const company = await PurchaseCompany.findOne({ _id: req.params.id, user: req.user._id });

    if (company) {
      // Check if there are linked purchases or payments
      const linkedPurchases = await Purchase.countDocuments({ purchaseCompany: company._id, user: req.user._id });
      const linkedPayments = await Payment.countDocuments({ purchaseCompany: company._id, user: req.user._id });

      if (linkedPurchases > 0 || linkedPayments > 0) {
        res.status(400);
        throw new Error('Cannot delete company with existing purchases or payments. Delete transactions first.');
      }

      await company.deleteOne();
      res.json({ message: 'Company removed successfully' });
    } else {
      res.status(404);
      throw new Error('Company not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase company ledger (detailed transactions)
// @route   GET /api/purchase-companies/:id/ledger
// @access  Private
export const getPurchaseCompanyLedger = async (req, res, next) => {
  try {
    const company = await PurchaseCompany.findOne({ _id: req.params.id, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Purchase Company not found');
    }

    // Fetch all purchases for this company
    const purchases = await Purchase.find({ purchaseCompany: company._id, user: req.user._id }).sort({ date: 1 });

    // Fetch all payments to this company
    const payments = await Payment.find({ purchaseCompany: company._id, user: req.user._id }).sort({ paymentDate: 1 });

    // Fetch all expenses linked to this purchase company
    const expenses = await Expense.find({ purchaseCompany: company._id, user: req.user._id }).sort({ date: 1 });

    // Combine transactions
    const transactions = [];

    // Map purchases
    purchases.forEach((p) => {
      transactions.push({
        _id: p._id,
        date: p.date,
        type: 'Purchase',
        invoiceNumber: p.invoiceNumber,
        description: `Purchase - ${p.productName} (${p.quantity} x ${p.rate})`,
        debit: 0,
        credit: p.totalAmount,
        remarks: p.notes || '',
        attachment: '',
      });
    });

    // Map payments
    payments.forEach((p) => {
      transactions.push({
        _id: p._id,
        date: p.paymentDate,
        type: 'Payment Paid',
        invoiceNumber: p.purchaseInvoice ? 'Against Invoice' : 'General Payment',
        description: `Payment via ${p.paymentMode}`,
        debit: p.amount,
        credit: 0,
        remarks: p.notes || '',
        attachment: p.receiptImage || '',
      });
    });

    // Map expenses
    expenses.forEach((e) => {
      transactions.push({
        _id: e._id,
        date: e.date,
        type: 'Expense',
        invoiceNumber: e.category || 'Expense',
        description: `Expense - ${e.title}`,
        debit: 0,
        credit: e.amount,
        remarks: e.notes || '',
        attachment: '',
      });
    });

    // Sort by date ascending
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance (For Purchase Company, credits increase outstanding, debits decrease it)
    let runningBalance = 0;
    const ledger = transactions.map((t) => {
      runningBalance += (t.credit - t.debit);
      return {
        ...t,
        runningBalance,
      };
    });

    // Stock stats for this company
    const stockStats = {
      quantityPurchased: company.totals.quantityPurchased,
      // Sum sold quantity from all purchases of this company
      soldQuantity: purchases.reduce((acc, p) => acc + p.soldQuantity, 0),
      remainingQuantity: purchases.reduce((acc, p) => acc + p.remainingQuantity, 0),
    };

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    res.json({
      company,
      ledger,
      totals: {
        totalPurchase: company.totals.purchaseAmount,
        totalPaid: company.totals.paidAmount,
        outstandingBalance: company.totals.pendingAmount + totalExpenses,
        remainingQuantity: stockStats.remainingQuantity,
        soldQuantity: stockStats.soldQuantity,
        quantityPurchased: stockStats.quantityPurchased,
      },
    });
  } catch (error) {
    next(error);
  }
};
