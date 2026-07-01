import SalesCompany from '../models/SalesCompany.js';
import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';

// @desc    Get all sales companies
// @route   GET /api/sales-companies
// @access  Private
export const getSalesCompanies = async (req, res, next) => {
  try {
    const companies = await SalesCompany.find({}).sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a sales company
// @route   POST /api/sales-companies
// @access  Private
export const createSalesCompany = async (req, res, next) => {
  const { name, phone, address, notes } = req.body;

  try {
    const exists = await SalesCompany.findOne({ name });
    if (exists) {
      res.status(400);
      throw new Error('Company already exists');
    }

    const company = await SalesCompany.create({
      name,
      phone,
      address,
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
  const { name, phone, address, notes } = req.body;

  try {
    const company = await SalesCompany.findById(req.params.id);

    if (company) {
      company.name = name || company.name;
      company.phone = phone || company.phone;
      company.address = address || company.address;
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
    const company = await SalesCompany.findById(req.params.id);

    if (company) {
      // Check if there are linked sales or payments
      const linkedSales = await Sale.countDocuments({ salesCompany: company._id });
      const linkedPayments = await Payment.countDocuments({ salesCompany: company._id });

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
    const company = await SalesCompany.findById(req.params.id);
    if (!company) {
      res.status(404);
      throw new Error('Sales Company not found');
    }

    // Fetch all sales for this company
    const sales = await Sale.find({ salesCompany: company._id }).sort({ date: 1 });

    // Fetch all payments from this company
    const payments = await Payment.find({ salesCompany: company._id }).sort({ paymentDate: 1 });

    // Combine transactions
    const transactions = [];

    // Map sales
    sales.forEach((s) => {
      transactions.push({
        _id: s._id,
        date: s.date,
        type: 'Sale',
        invoiceNumber: s.invoiceNumber,
        description: `Sale - ${s.productName} (${s.quantity} x ${s.rate})`,
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
