import Expense from '../models/Expense.js';

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
export const getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({}).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
};

// @desc    Create an expense
// @route   POST /api/expenses
// @access  Private
export const createExpense = async (req, res, next) => {
  const { title, amount, category, date, notes } = req.body;

  try {
    const expense = await Expense.create({
      title,
      amount: Number(amount),
      category,
      date,
      notes,
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (expense) {
      await expense.deleteOne();
      res.json({ message: 'Expense deleted successfully' });
    } else {
      res.status(404);
      throw new Error('Expense record not found');
    }
  } catch (error) {
    next(error);
  }
};
