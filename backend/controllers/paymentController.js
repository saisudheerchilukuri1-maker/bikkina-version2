import Payment from '../models/Payment.js';
import PurchaseCompany from '../models/PurchaseCompany.js';
import SalesCompany from '../models/SalesCompany.js';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate('purchaseCompany', 'name')
      .populate('salesCompany', 'name')
      .populate('purchaseInvoice', 'invoiceNumber')
      .populate('salesInvoice', 'invoiceNumber')
      .sort({ paymentDate: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a payment transaction
// @route   POST /api/payments
// @access  Private
export const createPayment = async (req, res, next) => {
  const {
    companyType,
    purchaseCompany,
    salesCompany,
    purchaseInvoice,
    salesInvoice,
    amount,
    paymentDate,
    paymentMode,
    notes,
    receiptImage,
  } = req.body;

  try {
    const paymentAmount = Number(amount);
    let remainingToAllocate = paymentAmount;
    const allocations = [];

    if (companyType === 'PurchaseCompany') {
      const company = await PurchaseCompany.findOne({ _id: purchaseCompany, user: req.user._id });
      if (!company) {
        res.status(404);
        throw new Error('Purchase Company not found');
      }

      // Step 1: Allocate to specified invoice first (if any)
      if (purchaseInvoice) {
        const invoice = await Purchase.findOne({ _id: purchaseInvoice, user: req.user._id });
        if (!invoice) {
          res.status(404);
          throw new Error('Purchase Invoice not found');
        }

        if (paymentAmount > invoice.pendingAmount) {
          res.status(400);
          throw new Error(`Payment amount (${paymentAmount}) exceeds the pending balance of the selected invoice (${invoice.pendingAmount}).`);
        }

        const allocateAmount = Math.min(remainingToAllocate, invoice.pendingAmount);
        if (allocateAmount > 0) {
          invoice.paidAmount += allocateAmount;
          invoice.pendingAmount = invoice.totalAmount - invoice.paidAmount;
          
          if (invoice.paidAmount === 0) invoice.paymentStatus = 'Pending';
          else if (invoice.paidAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
          else invoice.paymentStatus = 'Partially Paid';

          await invoice.save();

          allocations.push({
            invoiceId: invoice._id,
            invoiceType: 'Purchase',
            amount: allocateAmount,
          });

          remainingToAllocate -= allocateAmount;
        }
      }

      // Step 2: FIFO Allocation of remaining amount to other pending invoices
      if (remainingToAllocate > 0) {
        const pendingInvoices = await Purchase.find({
          user: req.user._id,
          purchaseCompany: company._id,
          paymentStatus: { $ne: 'Paid' },
          _id: { $ne: purchaseInvoice || null },
        }).sort({ date: 1 });

        for (const invoice of pendingInvoices) {
          if (remainingToAllocate <= 0) break;

          const allocateAmount = Math.min(remainingToAllocate, invoice.pendingAmount);
          if (allocateAmount > 0) {
            invoice.paidAmount += allocateAmount;
            invoice.pendingAmount = invoice.totalAmount - invoice.paidAmount;

            if (invoice.paidAmount === 0) invoice.paymentStatus = 'Pending';
            else if (invoice.paidAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
            else invoice.paymentStatus = 'Partially Paid';

            await invoice.save();

            allocations.push({
              invoiceId: invoice._id,
              invoiceType: 'Purchase',
              amount: allocateAmount,
            });

            remainingToAllocate -= allocateAmount;
          }
        }
      }

      // Update company totals
      company.totals.paidAmount += paymentAmount;
      company.totals.pendingAmount -= paymentAmount;
      await company.save();

    } else if (companyType === 'SalesCompany') {
      const company = await SalesCompany.findOne({ _id: salesCompany, user: req.user._id });
      if (!company) {
        res.status(404);
        throw new Error('Sales Company not found');
      }

      // Step 1: Allocate to specified invoice first (if any)
      if (salesInvoice) {
        const invoice = await Sale.findOne({ _id: salesInvoice, user: req.user._id });
        if (!invoice) {
          res.status(404);
          throw new Error('Sales Invoice not found');
        }

        if (paymentAmount > invoice.pendingAmount) {
          res.status(400);
          throw new Error(`Payment amount (${paymentAmount}) exceeds the pending balance of the selected invoice (${invoice.pendingAmount}).`);
        }

        const allocateAmount = Math.min(remainingToAllocate, invoice.pendingAmount);
        if (allocateAmount > 0) {
          invoice.receivedAmount += allocateAmount;
          invoice.pendingAmount = invoice.totalAmount - invoice.receivedAmount;

          if (invoice.receivedAmount === 0) invoice.paymentStatus = 'Pending';
          else if (invoice.receivedAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
          else invoice.paymentStatus = 'Partially Paid';

          await invoice.save();

          allocations.push({
            invoiceId: invoice._id,
            invoiceType: 'Sale',
            amount: allocateAmount,
          });

          remainingToAllocate -= allocateAmount;
        }
      }

      // Step 2: FIFO Allocation of remaining amount to other pending invoices
      if (remainingToAllocate > 0) {
        const pendingInvoices = await Sale.find({
          user: req.user._id,
          salesCompany: company._id,
          paymentStatus: { $ne: 'Paid' },
          _id: { $ne: salesInvoice || null },
        }).sort({ date: 1 });

        for (const invoice of pendingInvoices) {
          if (remainingToAllocate <= 0) break;

          const allocateAmount = Math.min(remainingToAllocate, invoice.pendingAmount);
          if (allocateAmount > 0) {
            invoice.receivedAmount += allocateAmount;
            invoice.pendingAmount = invoice.totalAmount - invoice.receivedAmount;

            if (invoice.receivedAmount === 0) invoice.paymentStatus = 'Pending';
            else if (invoice.receivedAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
            else invoice.paymentStatus = 'Partially Paid';

            await invoice.save();

            allocations.push({
              invoiceId: invoice._id,
              invoiceType: 'Sale',
              amount: allocateAmount,
            });

            remainingToAllocate -= allocateAmount;
          }
        }
      }

      // Update company totals
      company.totals.receivedAmount += paymentAmount;
      company.totals.pendingAmount -= paymentAmount;
      await company.save();
    }

    const payment = new Payment({
      user: req.user._id,
      companyType,
      purchaseCompany: companyType === 'PurchaseCompany' ? purchaseCompany : undefined,
      salesCompany: companyType === 'SalesCompany' ? salesCompany : undefined,
      purchaseInvoice: purchaseInvoice || undefined,
      salesInvoice: salesInvoice || undefined,
      amount: paymentAmount,
      paymentDate,
      paymentMode,
      notes,
      receiptImage,
      allocations,
    });

    const savedPayment = await payment.save();
    res.status(201).json(savedPayment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a payment (and roll back allocations & totals)
// @route   DELETE /api/payments/:id
// @access  Private
export const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, user: req.user._id });
    if (!payment) {
      res.status(404);
      throw new Error('Payment transaction not found');
    }

    // Step 1: Revert all allocations on invoices
    for (const alloc of payment.allocations) {
      if (alloc.invoiceType === 'Purchase') {
        const invoice = await Purchase.findOne({ _id: alloc.invoiceId, user: req.user._id });
        if (invoice) {
          invoice.paidAmount -= alloc.amount;
          invoice.pendingAmount = invoice.totalAmount - invoice.paidAmount;

          if (invoice.paidAmount === 0) invoice.paymentStatus = 'Pending';
          else if (invoice.paidAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
          else invoice.paymentStatus = 'Partially Paid';

          await invoice.save();
        }
      } else if (alloc.invoiceType === 'Sale') {
        const invoice = await Sale.findOne({ _id: alloc.invoiceId, user: req.user._id });
        if (invoice) {
          invoice.receivedAmount -= alloc.amount;
          invoice.pendingAmount = invoice.totalAmount - invoice.receivedAmount;

          if (invoice.receivedAmount === 0) invoice.paymentStatus = 'Pending';
          else if (invoice.receivedAmount >= invoice.totalAmount) invoice.paymentStatus = 'Paid';
          else invoice.paymentStatus = 'Partially Paid';

          await invoice.save();
        }
      }
    }

    // Step 2: Revert company totals
    if (payment.companyType === 'PurchaseCompany') {
      const company = await PurchaseCompany.findOne({ _id: payment.purchaseCompany, user: req.user._id });
      if (company) {
        company.totals.paidAmount -= payment.amount;
        company.totals.pendingAmount += payment.amount;
        await company.save();
      }
    } else if (payment.companyType === 'SalesCompany') {
      const company = await SalesCompany.findOne({ _id: payment.salesCompany, user: req.user._id });
      if (company) {
        company.totals.receivedAmount -= payment.amount;
        company.totals.pendingAmount += payment.amount;
        await company.save();
      }
    }

    await payment.deleteOne();
    res.json({ message: 'Payment deleted and accounting reverted successfully' });
  } catch (error) {
    next(error);
  }
};
