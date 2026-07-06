import SalesCompany from '../models/SalesCompany.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';

// @desc    Get all sales companies
// @route   GET /api/sales-companies
// @access  Private
export const getSalesCompanies = async (req, res, next) => {
  try {
    const companies = await SalesCompany.find({ user: req.user._id }).sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a sales company
// @route   POST /api/sales-companies
// @access  Private
export const createSalesCompany = async (req, res, next) => {
  const { name, phone, address, gstNumber, notes } = req.body;

  try {
    const exists = await SalesCompany.findOne({ name, user: req.user._id });
    if (exists) {
      res.status(400);
      throw new Error('Company already exists');
    }

    const company = await SalesCompany.create({
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

// @desc    Update a sales company
// @route   PUT /api/sales-companies/:id
// @access  Private
export const updateSalesCompany = async (req, res, next) => {
  const { name, phone, address, gstNumber, notes } = req.body;

  try {
    const company = await SalesCompany.findOne({ _id: req.params.id, user: req.user._id });

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

// @desc    Delete a sales company
// @route   DELETE /api/sales-companies/:id
// @access  Private
export const deleteSalesCompany = async (req, res, next) => {
  try {
    const company = await SalesCompany.findOne({ _id: req.params.id, user: req.user._id });

    if (company) {
      // Check if there are linked sales or payments
      const linkedSales = await Sale.countDocuments({ salesCompany: company._id, user: req.user._id });
      const linkedPayments = await Payment.countDocuments({ salesCompany: company._id, user: req.user._id });

      if (linkedSales > 0 || linkedPayments > 0) {
        res.status(400);
        throw new Error('Cannot delete company with existing sales or payments. Delete transactions first.');
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

// @desc    Get sales company ledger (detailed transactions)
// @route   GET /api/sales-companies/:id/ledger
// @access  Private
export const getSalesCompanyLedger = async (req, res, next) => {
  try {
    const company = await SalesCompany.findOne({ _id: req.params.id, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Sales Company not found');
    }

    // Fetch all sales for this company
    const sales = await Sale.find({ salesCompany: company._id, user: req.user._id }).sort({ date: 1 });

    // Fetch all payments from this company
    const payments = await Payment.find({ salesCompany: company._id, user: req.user._id }).sort({ paymentDate: 1 });

    // Combine transactions
    const transactions = [];

    // Map sales
    sales.forEach((s) => {
      const description = s.items && s.items.length > 0
        ? `Sale - ${s.items.map(item => `${item.productName} (${item.quantity} x ${item.rate})`).join(', ')}`
        : `Sale - ${s.productName} (${s.quantity} x ${s.rate})`;
      transactions.push({
        _id: s._id,
        date: s.date,
        type: 'Sale',
        invoiceNumber: s.invoiceNumber,
        description,
        debit: s.totalAmount,
        credit: 0,
        remarks: s.notes || '',
        attachment: '',
      });
    });

    // Map payments
    payments.forEach((p) => {
      transactions.push({
        _id: p._id,
        date: p.paymentDate,
        type: 'Payment Received',
        invoiceNumber: p.salesInvoice ? 'Against Invoice' : 'General Receipt',
        description: `Receipt via ${p.paymentMode}`,
        debit: 0,
        credit: p.amount,
        remarks: p.notes || '',
        attachment: p.receiptImage || '',
      });
    });

    // Sort by date ascending
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance (For Sales Company, debits increase outstanding, credits decrease it)
    let runningBalance = 0;
    const ledger = transactions.map((t) => {
      runningBalance += (t.debit - t.credit);
      return {
        ...t,
        runningBalance,
      };
    });

    res.json({
      company,
      ledger,
      totals: {
        totalSales: company.totals.salesAmount,
        totalReceived: company.totals.receivedAmount,
        outstandingBalance: company.totals.pendingAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
