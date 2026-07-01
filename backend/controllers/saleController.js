import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import SalesCompany from '../models/SalesCompany.js';

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
export const getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find({})
      .populate('salesCompany', 'name')
      .populate('purchaseInvoice', 'invoiceNumber remainingQuantity quantity soldQuantity')
      .sort({ date: -1 });
    res.json(sales);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a sale
// @route   POST /api/sales
// @access  Private
export const createSale = async (req, res, next) => {
  const { invoiceNumber, salesCompany, purchaseInvoice, productName, quantity, rate, date, notes } = req.body;

  try {
    // Check if invoice number is unique
    const invoiceExists = await Sale.findOne({ invoiceNumber });
    if (invoiceExists) {
      res.status(400);
      throw new Error('Sales invoice number already exists');
    }

    // Verify company exists
    const company = await SalesCompany.findById(salesCompany);
    if (!company) {
      res.status(404);
      throw new Error('Sales Company not found');
    }

    // Verify purchase invoice exists and check stock
    const purchase = await Purchase.findById(purchaseInvoice);
    if (!purchase) {
      res.status(404);
      throw new Error('Linked Purchase Invoice not found');
    }

    if (purchase.remainingQuantity < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock in selected Purchase Invoice (${purchase.invoiceNumber}). Available: ${purchase.remainingQuantity}, Requested: ${quantity}`);
    }

    const totalAmount = quantity * rate;

    // Deduct stock from purchase invoice
    purchase.soldQuantity += quantity;
    purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
    await purchase.save();

    const sale = new Sale({
      invoiceNumber,
      salesCompany,
      purchaseInvoice,
      productName,
      quantity,
      rate,
      totalAmount,
      pendingAmount: totalAmount,
      date,
      notes,
    });

    const savedSale = await sale.save();

    // Update Sales Company totals
    company.totals.salesAmount += totalAmount;
    company.totals.pendingAmount += totalAmount;
    await company.save();

    res.status(201).json(savedSale);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a sale
// @route   PUT /api/sales/:id
// @access  Private
export const updateSale = async (req, res, next) => {
  const { productName, quantity, rate, date, notes } = req.body;

  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      res.status(404);
      throw new Error('Sale record not found');
    }

    const company = await SalesCompany.findById(sale.salesCompany);
    if (!company) {
      res.status(404);
      throw new Error('Associated Sales Company not found');
    }

    const purchase = await Purchase.findById(sale.purchaseInvoice);
    if (!purchase) {
      res.status(404);
      throw new Error('Linked Purchase Invoice not found');
    }

    const oldTotal = sale.totalAmount;
    const oldQty = sale.quantity;

    // Calculate stock changes
    if (quantity !== undefined && quantity !== oldQty) {
      const qtyDelta = quantity - oldQty;
      // Check if purchase has enough stock for the increase
      if (purchase.remainingQuantity < qtyDelta) {
        res.status(400);
        throw new Error(`Insufficient stock in Purchase Invoice for this update. Available additional: ${purchase.remainingQuantity}, Requested additional: ${qtyDelta}`);
      }

      // Adjust stock in purchase
      purchase.soldQuantity += qtyDelta;
      purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
      await purchase.save();
    }

    sale.productName = productName || sale.productName;
    sale.quantity = quantity !== undefined ? quantity : sale.quantity;
    sale.rate = rate !== undefined ? rate : sale.rate;
    sale.date = date || sale.date;
    sale.notes = notes ?? sale.notes;

    // Recalculate totals
    sale.totalAmount = sale.quantity * sale.rate;
    sale.pendingAmount = sale.totalAmount - sale.receivedAmount;

    // Update payment status
    if (sale.receivedAmount === 0) {
      sale.paymentStatus = 'Pending';
    } else if (sale.receivedAmount >= sale.totalAmount) {
      sale.paymentStatus = 'Paid';
    } else {
      sale.paymentStatus = 'Partially Paid';
    }

    const updatedSale = await sale.save();

    // Update sales company totals with delta
    const amountDelta = updatedSale.totalAmount - oldTotal;
    company.totals.salesAmount += amountDelta;
    company.totals.pendingAmount += amountDelta;
    await company.save();

    res.json(updatedSale);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sale
// @route   DELETE /api/sales/:id
// @access  Private
export const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      res.status(404);
      throw new Error('Sale record not found');
    }

    // Revert stock in purchase
    const purchase = await Purchase.findById(sale.purchaseInvoice);
    if (purchase) {
      purchase.soldQuantity -= sale.quantity;
      purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
      await purchase.save();
    }

    // Revert company totals
    const company = await SalesCompany.findById(sale.salesCompany);
    if (company) {
      company.totals.salesAmount -= sale.totalAmount;
      company.totals.pendingAmount -= sale.totalAmount;
      company.totals.receivedAmount -= sale.receivedAmount;
      await company.save();
    }

    await sale.deleteOne();
    res.json({ message: 'Sale removed successfully' });
  } catch (error) {
    next(error);
  }
};
