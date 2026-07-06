import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';
import PurchaseCompany from '../models/PurchaseCompany.js';
import SalesCompany from '../models/SalesCompany.js';

// Helper to get start and end of today in local time
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// @desc    Get dashboard metrics
// @route   GET /api/dashboard
// @access  Private
export const getDashboardData = async (req, res, next) => {
  try {
    const { start, end } = getTodayRange();
    const userMatch = { user: new mongoose.Types.ObjectId(req.user._id) };

    // 1. Today's Purchases
    const todayPurchasesData = await Purchase.aggregate([
      { $match: { ...userMatch, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const todayPurchases = todayPurchasesData[0]?.total || 0;

    // 2. Today's Sales
    const todaySalesData = await Sale.aggregate([
      { $match: { ...userMatch, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const todaySales = todaySalesData[0]?.total || 0;

    // 3. Today's Expenses
    const todayExpensesData = await Expense.aggregate([
      { $match: { ...userMatch, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const todayExpenses = todayExpensesData[0]?.total || 0;

    // 4. Outstanding Payables (Sum of pendingAmount from all Purchase Companies)
    const payablesData = await PurchaseCompany.aggregate([
      { $match: userMatch },
      { $group: { _id: null, total: { $sum: '$totals.pendingAmount' } } },
    ]);
    const outstandingPayables = payablesData[0]?.total || 0;

    // 5. Outstanding Receivables (Sum of pendingAmount from all Sales Companies)
    const receivablesData = await SalesCompany.aggregate([
      { $match: userMatch },
      { $group: { _id: null, total: { $sum: '$totals.pendingAmount' } } },
    ]);
    const outstandingReceivables = receivablesData[0]?.total || 0;

    // 6. Total Profit Calculation
    // Total Revenue (all sales)
    const totalSalesRevenueData = await Sale.aggregate([
      { $match: userMatch },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = totalSalesRevenueData[0]?.total || 0;

    // Cost of Goods Sold (COGS)
    // Formula: Sum of (Sale.items.quantity * Purchase.rate)
    const salesList = await Sale.find({ user: req.user._id })
      .populate('items.purchaseInvoice', 'rate')
      .populate('purchaseInvoice', 'rate');
    let totalCogs = 0;
    salesList.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const purchaseRate = item.purchaseInvoice?.rate || 0;
          totalCogs += item.quantity * purchaseRate;
        });
      } else if (sale.purchaseInvoice && sale.quantity) {
        const purchaseRate = sale.purchaseInvoice?.rate || 0;
        totalCogs += sale.quantity * purchaseRate;
      }
    });

    // Total Expenses
    const totalExpensesData = await Expense.aggregate([
      { $match: userMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpenses = totalExpensesData[0]?.total || 0;

    const netProfit = totalRevenue - totalCogs - totalExpenses;

    // 7. Recent Transactions (Limit 10, combined)
    const purchases = await Purchase.find({ user: req.user._id })
      .populate('purchaseCompany', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const sales = await Sale.find({ user: req.user._id })
      .populate('salesCompany', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const payments = await Payment.find({ user: req.user._id })
      .populate('purchaseCompany', 'name')
      .populate('salesCompany', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const expenses = await Expense.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);

    const transactions = [];

    purchases.forEach((p) => {
      transactions.push({
        _id: p._id,
        date: p.date,
        type: 'Purchase',
        party: p.purchaseCompany?.name || 'Unknown',
        amount: p.totalAmount,
        invoiceNumber: p.invoiceNumber,
      });
    });

    sales.forEach((s) => {
      transactions.push({
        _id: s._id,
        date: s.date,
        type: 'Sale',
        party: s.salesCompany?.name || 'Unknown',
        amount: s.totalAmount,
        invoiceNumber: s.invoiceNumber,
      });
    });

    payments.forEach((p) => {
      const party = p.companyType === 'PurchaseCompany' 
        ? p.purchaseCompany?.name 
        : p.salesCompany?.name;
      transactions.push({
        _id: p._id,
        date: p.paymentDate,
        type: p.companyType === 'PurchaseCompany' ? 'Payment Paid' : 'Payment Received',
        party: party || 'Unknown',
        amount: p.amount,
        invoiceNumber: '-',
      });
    });

    expenses.forEach((e) => {
      transactions.push({
        _id: e._id,
        date: e.date,
        type: 'Expense',
        party: e.category,
        amount: e.amount,
        invoiceNumber: '-',
      });
    });

    // Sort combined transactions by date desc and limit to 10
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentTransactions = transactions.slice(0, 10);

    // 8. Top Companies
    const topPurchaseCompanies = await PurchaseCompany.find({ user: req.user._id })
      .sort({ 'totals.purchaseAmount': -1 })
      .limit(5);

    const topSalesCompanies = await SalesCompany.find({ user: req.user._id })
      .sort({ 'totals.salesAmount': -1 })
      .limit(5);

    res.json({
      metrics: {
        todayPurchases,
        todaySales,
        todayExpenses,
        outstandingPayables,
        outstandingReceivables,
        netProfit,
      },
      recentTransactions,
      topCompanies: {
        purchases: topPurchaseCompanies,
        sales: topSalesCompanies,
      },
    });
  } catch (error) {
    next(error);
  }
};
