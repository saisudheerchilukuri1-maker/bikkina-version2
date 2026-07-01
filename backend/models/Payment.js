import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
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
    purchaseInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    salesInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      default: Date.now,
    },
    paymentMode: {
      type: String,
      required: [true, 'Payment mode is required'],
      enum: ['Cash', 'Bank', 'UPI', 'Cheque'],
    },
    notes: {
      type: String,
      default: '',
    },
    receiptImage: {
      type: String, // Stored as base64 or URL path
      default: '',
    },
    allocations: [
      {
        invoiceId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        invoiceType: {
          type: String,
          enum: ['Purchase', 'Sale'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
