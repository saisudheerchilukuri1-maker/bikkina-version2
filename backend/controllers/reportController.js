import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Expense from '../models/Expense.js';
import PurchaseCompany from '../models/PurchaseCompany.js';
import SalesCompany from '../models/SalesCompany.js';

// @desc    Generate report data
// @route   GET /api/reports
// @access  Private
export const getReportData = async (req, res, next) => {
  const { type, companyId, startDate, endDate, invoiceNumber } = req.query;

  try {
    let query = { user: req.user._id };

    // Apply date range filter if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Apply invoice search filter if provided
    if (invoiceNumber) {
      query.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
    }

    let reportData = [];

    switch (type) {
      case 'purchases':
        if (companyId) {
          query.purchaseCompany = companyId;
        }
        reportData = await Purchase.find(query)
          .populate('purchaseCompany', 'name')
          .sort({ date: -1 });
        break;

      case 'sales':
        if (companyId) {
          query.salesCompany = companyId;
        }
        reportData = await Sale.find(query)
          .populate('salesCompany', 'name')
          .populate('items.purchaseInvoice', 'invoiceNumber')
          .populate('purchaseInvoice', 'invoiceNumber')
          .sort({ date: -1 });
        break;

      case 'expenses':
        const expenseQuery = { user: req.user._id };
        if (startDate || endDate) {
          expenseQuery.date = {};
          if (startDate) expenseQuery.date.$gte = new Date(startDate);
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            expenseQuery.date.$lte = end;
          }
        }
        reportData = await Expense.find(expenseQuery).sort({ date: -1 });
        break;

      case 'purchase-companies':
        const pCompQuery = { user: req.user._id };
        if (companyId) {
          pCompQuery._id = companyId;
        }
        reportData = await PurchaseCompany.find(pCompQuery).sort({ name: 1 });
        break;

      case 'sales-companies':
        const sCompQuery = { user: req.user._id };
        if (companyId) {
          sCompQuery._id = companyId;
        }
        reportData = await SalesCompany.find(sCompQuery).sort({ name: 1 });
        break;

      case 'outstandings':
        const purchasesOut = await PurchaseCompany.find({ user: req.user._id, 'totals.pendingAmount': { $gt: 0 } })
          .select('name totals phone')
          .sort({ 'totals.pendingAmount': -1 });

        const salesOut = await SalesCompany.find({ user: req.user._id, 'totals.pendingAmount': { $gt: 0 } })
          .select('name totals phone')
          .sort({ 'totals.pendingAmount': -1 });

        reportData = {
          payables: purchasesOut.map(p => ({
            _id: p._id,
            companyName: p.name,
            phone: p.phone,
            type: 'Payable',
            amount: p.totals.pendingAmount,
          })),
          receivables: salesOut.map(s => ({
            _id: s._id,
            companyName: s.name,
            phone: s.phone,
            type: 'Receivable',
            amount: s.totals.pendingAmount,
          })),
        };
        break;

      case 'profits':
        // Detailed profit report by date range
        // Revenue (Sales)
        const salesRevenue = await Sale.find(query)
          .populate('items.purchaseInvoice', 'rate')
          .populate('purchaseInvoice', 'rate');
        
        // Sum expenses in date range
        const expQuery = { user: req.user._id };
        if (startDate || endDate) {
          expQuery.date = {};
          if (startDate) expQuery.date.$gte = new Date(startDate);
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            expQuery.date.$lte = end;
          }
        }
        const expensesList = await Expense.find(expQuery);

        let totalRevenue = 0;
        let totalCOGS = 0;
        salesRevenue.forEach((sale) => {
          totalRevenue += sale.totalAmount;
          if (sale.items && sale.items.length > 0) {
            sale.items.forEach((item) => {
              const purchaseRate = item.purchaseInvoice?.rate || 0;
              totalCOGS += item.quantity * purchaseRate;
            });
          } else if (sale.purchaseInvoice && sale.quantity) {
            const purchaseRate = sale.purchaseInvoice?.rate || 0;
            totalCOGS += sale.quantity * purchaseRate;
          }
        });

        const totalExpenses = expensesList.reduce((acc, exp) => acc + exp.amount, 0);
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses;

        reportData = {
          totalRevenue,
          totalCOGS,
          totalExpenses,
          grossProfit,
          netProfit,
          salesCount: salesRevenue.length,
          expensesCount: expensesList.length,
        };
        break;

      default:
        res.status(400);
        throw new Error('Invalid report type specified');
    }

    res.json(reportData);
  } catch (error) {
    next(error);
  }
};
