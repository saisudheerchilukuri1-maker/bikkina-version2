import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyType: {
      type: String,
      required: [true, 'Company type is required'],
      enum: ['PurchaseCompany', 'SalesCompany'],
    },
    purchaseCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseCompany',
      required: function () {
        return this.companyType === 'PurchaseCompany';
      },
    },
    salesCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesCompany',
      required: function () {
        return this.companyType === 'SalesCompany';
      },
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
