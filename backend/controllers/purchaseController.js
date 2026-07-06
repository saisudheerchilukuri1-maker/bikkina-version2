import Purchase from '../models/Purchase.js';
import PurchaseCompany from '../models/PurchaseCompany.js';
import Sale from '../models/Sale.js';

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
export const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ user: req.user._id })
      .populate('purchaseCompany', 'name')
      .sort({ date: -1 });
    res.json(purchases);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a purchase
// @route   POST /api/purchases
// @access  Private
export const createPurchase = async (req, res, next) => {
  const { invoiceNumber, purchaseCompany, productName, quantity, rate, date, notes } = req.body;

  try {
    // Check if invoice number is unique for this user
    const invoiceExists = await Purchase.findOne({ invoiceNumber, user: req.user._id });
    if (invoiceExists) {
      res.status(400);
      throw new Error('Invoice number already exists');
    }

    // Verify company exists for this user
    const company = await PurchaseCompany.findOne({ _id: purchaseCompany, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Purchase Company not found');
    }

    const totalAmount = quantity * rate;

    const purchase = new Purchase({
      user: req.user._id,
      invoiceNumber,
      purchaseCompany,
      productName,
      quantity,
      rate,
      totalAmount,
      remainingQuantity: quantity,
      pendingAmount: totalAmount,
      date,
      notes,
    });

    const savedPurchase = await purchase.save();

    // Update Company totals
    company.totals.purchaseAmount += totalAmount;
    company.totals.pendingAmount += totalAmount;
    company.totals.quantityPurchased += quantity;
    await company.save();

    res.status(201).json(savedPurchase);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a purchase
// @route   PUT /api/purchases/:id
// @access  Private
export const updatePurchase = async (req, res, next) => {
  const { productName, quantity, rate, date, notes } = req.body;

  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, user: req.user._id });
    if (!purchase) {
      res.status(404);
      throw new Error('Purchase not found');
    }

    const company = await PurchaseCompany.findOne({ _id: purchase.purchaseCompany, user: req.user._id });
    if (!company) {
      res.status(404);
      throw new Error('Associated Purchase Company not found');
    }

    // If changing quantity, verify that new quantity is not less than already sold stock
    if (quantity !== undefined && quantity < purchase.soldQuantity) {
      res.status(400);
      throw new Error(`Cannot set quantity less than already sold quantity (${purchase.soldQuantity})`);
    }

    const oldTotal = purchase.totalAmount;
    const oldQty = purchase.quantity;

    purchase.productName = productName || purchase.productName;
    purchase.quantity = quantity !== undefined ? quantity : purchase.quantity;
    purchase.rate = rate !== undefined ? rate : purchase.rate;
    purchase.date = date || purchase.date;
    purchase.notes = notes ?? purchase.notes;

    // Re-calculate totals
    purchase.totalAmount = purchase.quantity * purchase.rate;
    purchase.remainingQuantity = purchase.quantity - purchase.soldQuantity;
    purchase.pendingAmount = purchase.totalAmount - purchase.paidAmount;

    // Update payment status based on updated amounts
    if (purchase.paidAmount === 0) {
      purchase.paymentStatus = 'Pending';
    } else if (purchase.paidAmount >= purchase.totalAmount) {
      purchase.paymentStatus = 'Paid';
    } else {
      purchase.paymentStatus = 'Partially Paid';
    }

    const updatedPurchase = await purchase.save();

    // Calculate deltas and update company totals
    const amountDelta = updatedPurchase.totalAmount - oldTotal;
    const qtyDelta = updatedPurchase.quantity - oldQty;

    company.totals.purchaseAmount += amountDelta;
    company.totals.pendingAmount += amountDelta;
    company.totals.quantityPurchased += qtyDelta;
    await company.save();

    res.json(updatedPurchase);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a purchase
// @route   DELETE /api/purchases/:id
// @access  Private
export const deletePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, user: req.user._id });
    if (!purchase) {
      res.status(404);
      throw new Error('Purchase not found');
    }

    // Check if any quantity has been sold from this purchase
    if (purchase.soldQuantity > 0) {
      res.status(400);
      throw new Error('Cannot delete purchase invoice because items from this invoice have already been sold.');
    }

    // Revert company totals
    const company = await PurchaseCompany.findOne({ _id: purchase.purchaseCompany, user: req.user._id });
    if (company) {
      company.totals.purchaseAmount -= purchase.totalAmount;
      company.totals.pendingAmount -= purchase.totalAmount; 
      company.totals.paidAmount -= purchase.paidAmount;
      company.totals.quantityPurchased -= purchase.quantity;
      await company.save();
    }

    await purchase.deleteOne();

    res.json({ message: 'Purchase removed successfully' });
  } catch (error) {
    next(error);
  }
};
