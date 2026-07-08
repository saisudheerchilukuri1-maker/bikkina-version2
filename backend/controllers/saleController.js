import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import SalesCompany from '../models/SalesCompany.js';

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
export const getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find({ user: req.user._id })
      .populate('salesCompany', 'name')
      .populate('items.purchaseInvoice', 'invoiceNumber remainingQuantity quantity soldQuantity')
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
  const { invoiceNumber, salesCompany, items, deduction, date, notes } = req.body;

  try {
    // Check if invoice number is unique for this user
    const invoiceExists = await Sale.findOne({ invoiceNumber, user: req.user._id });
    if (invoiceExists) {
      res.status(400);
      throw new Error('Sales invoice number already exists');
    }

    // Verify company exists
    const company = await SalesCompany.findOne({ _id: salesCompany, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Sales Company not found');
    }

    if (!items || items.length === 0) {
      res.status(400);
      throw new Error('At least one sales item is required');
    }

    // Group requested quantities by purchaseInvoice ID to validate total requested stock
    const requestedQuantities = {};
    for (const item of items) {
      if (item.purchaseInvoice) {
        const pinvStr = item.purchaseInvoice.toString();
        requestedQuantities[pinvStr] = (requestedQuantities[pinvStr] || 0) + Number(item.quantity);
      }
    }

    // Verify each purchase invoice stock
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
      if (!purchase) {
        res.status(404);
        throw new Error(`Stock source Purchase Invoice not found for product: ${item.productName}`);
      }

      const qty = Number(item.quantity);
      const totalRequested = requestedQuantities[item.purchaseInvoice.toString()];
      if (purchase.remainingQuantity < totalRequested) {
        res.status(400);
        throw new Error(`Insufficient stock in selected Purchase Invoice (${purchase.invoiceNumber}). Available: ${purchase.remainingQuantity}, Total requested in this invoice: ${totalRequested}`);
      }

      const rate = Number(item.rate);
      const itemTotal = qty * rate;
      totalAmount += itemTotal;

      processedItems.push({
        purchaseInvoice: item.purchaseInvoice,
        productName: item.productName || purchase.productName,
        quantity: qty,
        rate,
        totalAmount: itemTotal,
      });
    }

    // Deduct stock from purchases
    for (const item of processedItems) {
      const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
      purchase.soldQuantity += item.quantity;
      purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
      await purchase.save();
    }

    const saleDeduction = Number(deduction) || 0;

    const sale = new Sale({
      user: req.user._id,
      invoiceNumber,
      salesCompany,
      items: processedItems,
      totalAmount,
      deduction: saleDeduction,
      pendingAmount: totalAmount - saleDeduction,
      date,
      notes,
    });

    const savedSale = await sale.save();

    // Update Sales Company totals
    company.totals.salesAmount += totalAmount;
    company.totals.pendingAmount += (totalAmount - saleDeduction);
    await company.save();

    res.status(201).json(savedSale);
  } catch (error) {
    next(error);
  }
};

// Helper to restore old stock in case of validation failures
const restoreOldStock = async (sale, userId) => {
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: userId });
      if (purchase) {
        purchase.soldQuantity += item.quantity;
        purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
        await purchase.save();
      }
    }
  } else if (sale.purchaseInvoice && sale.quantity) {
    const purchase = await Purchase.findOne({ _id: sale.purchaseInvoice, user: userId });
    if (purchase) {
      purchase.soldQuantity += sale.quantity;
      purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
      await purchase.save();
    }
  }
};

// @desc    Update a sale
// @route   PUT /api/sales/:id
// @access  Private
export const updateSale = async (req, res, next) => {
  const { items, deduction, date, notes } = req.body;

  try {
    const sale = await Sale.findOne({ _id: req.params.id, user: req.user._id });
    if (!sale) {
      res.status(404);
      throw new Error('Sale record not found');
    }

    const company = await SalesCompany.findOne({ _id: sale.salesCompany, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Associated Sales Company not found');
    }

    // Step 1: Revert stock for the OLD items
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
        if (purchase) {
          purchase.soldQuantity -= item.quantity;
          purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
          await purchase.save();
        }
      }
    } else if (sale.purchaseInvoice && sale.quantity) {
      // Legacy single item rollback
      const purchase = await Purchase.findOne({ _id: sale.purchaseInvoice, user: req.user._id });
      if (purchase) {
        purchase.soldQuantity -= sale.quantity;
        purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
        await purchase.save();
      }
    }

    // Step 2: Validate stock for NEW items
    const processedItems = [];
    let totalAmount = 0;

    if (items && items.length > 0) {
      // Group requested quantities by purchaseInvoice ID to validate total requested stock
      const requestedQuantities = {};
      for (const item of items) {
        if (item.purchaseInvoice) {
          const pinvStr = item.purchaseInvoice.toString();
          requestedQuantities[pinvStr] = (requestedQuantities[pinvStr] || 0) + Number(item.quantity);
        }
      }

      for (const item of items) {
        const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
        if (!purchase) {
          // Restore old stock before throwing
          await restoreOldStock(sale, req.user._id);
          res.status(404);
          throw new Error(`Stock source Purchase Invoice not found for product: ${item.productName}`);
        }

        const qty = Number(item.quantity);
        const totalRequested = requestedQuantities[item.purchaseInvoice.toString()];
        if (purchase.remainingQuantity < totalRequested) {
          // Restore old stock before throwing
          await restoreOldStock(sale, req.user._id);
          res.status(400);
          throw new Error(`Insufficient stock in selected Purchase Invoice (${purchase.invoiceNumber}). Available: ${purchase.remainingQuantity}, Total requested in this invoice: ${totalRequested}`);
        }

        const rate = Number(item.rate);
        const itemTotal = qty * rate;
        totalAmount += itemTotal;

        processedItems.push({
          purchaseInvoice: item.purchaseInvoice,
          productName: item.productName || purchase.productName,
          quantity: qty,
          rate,
          totalAmount: itemTotal,
        });
      }

      // Deduct new stock
      for (const item of processedItems) {
        const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
        purchase.soldQuantity += item.quantity;
        purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
        await purchase.save();
      }

      sale.items = processedItems;
      // Clear legacy single fields
      sale.purchaseInvoice = undefined;
      sale.productName = undefined;
      sale.quantity = undefined;
      sale.rate = undefined;
    } else {
      // If items not sent, restore the old stock
      await restoreOldStock(sale, req.user._id);
      totalAmount = sale.totalAmount;
    }

    const oldTotal = sale.totalAmount;
    const oldDeduction = sale.deduction || 0;
    sale.date = date || sale.date;
    sale.notes = notes ?? sale.notes;
    sale.deduction = deduction !== undefined ? Number(deduction) : sale.deduction;

    // Recalculate totals
    sale.totalAmount = totalAmount;
    sale.pendingAmount = sale.totalAmount - sale.receivedAmount - sale.deduction;

    // Update payment status
    if (sale.receivedAmount === 0 && sale.deduction === 0) {
      sale.paymentStatus = 'Pending';
    } else if (sale.receivedAmount + sale.deduction >= sale.totalAmount) {
      sale.paymentStatus = 'Paid';
    } else {
      sale.paymentStatus = 'Partially Paid';
    }

    const updatedSale = await sale.save();

    // Update sales company totals with delta
    const amountDelta = updatedSale.totalAmount - oldTotal;
    const deductionDelta = updatedSale.deduction - oldDeduction;
    company.totals.salesAmount += amountDelta;
    company.totals.pendingAmount += (amountDelta - deductionDelta);
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
    const sale = await Sale.findOne({ _id: req.params.id, user: req.user._id });
    if (!sale) {
      res.status(404);
      throw new Error('Sale record not found');
    }

    // Revert stock in purchase
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        const purchase = await Purchase.findOne({ _id: item.purchaseInvoice, user: req.user._id });
        if (purchase) {
          purchase.soldQuantity -= item.quantity;
          purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
          await purchase.save();
        }
      }
    } else if (sale.purchaseInvoice && sale.quantity) {
      const purchase = await Purchase.findOne({ _id: sale.purchaseInvoice, user: req.user._id });
      if (purchase) {
        purchase.soldQuantity -= sale.quantity;
        purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
        await purchase.save();
      }
    }

    // Revert company totals
    const company = await SalesCompany.findOne({ _id: sale.salesCompany, user: req.user._id });
    if (company) {
      company.totals.salesAmount -= sale.totalAmount;
      company.totals.pendingAmount -= (sale.totalAmount - (sale.deduction || 0));
      company.totals.receivedAmount -= sale.receivedAmount;
      await company.save();
    }

    await sale.deleteOne();
    res.json({ message: 'Sale removed successfully' });
  } catch (error) {
    next(error);
  }
};
