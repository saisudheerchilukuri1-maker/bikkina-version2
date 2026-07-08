import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    salesCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesCompany',
      required: [true, 'Sales company is required'],
    },
    items: [
      {
        purchaseInvoice: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Purchase',
          required: [true, 'Purchase invoice link is required'],
        },
        productName: {
          type: String,
          required: [true, 'Product name is required'],
          trim: true,
        },
        quantity: {
          type: Number,
          required: [true, 'Quantity is required'],
          min: [0.001, 'Quantity must be greater than zero'],
        },
        rate: {
          type: Number,
          required: [true, 'Rate is required'],
          min: [0, 'Rate cannot be negative'],
        },
        totalAmount: {
          type: Number,
          required: true,
        },
      }
    ],
    // Deprecated single fields kept optional for legacy compatibility
    purchaseInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    productName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
    },
    rate: {
      type: Number,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    receivedAmount: {
      type: Number,
      default: 0,
    },
    deduction: {
      type: Number,
      default: 0,
      min: [0, 'Deduction cannot be negative'],
    },
    pendingAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid'],
      default: 'Pending',
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

// Pre-validate hook to calculate total, pendingAmount, and status
saleSchema.pre('validate', function (next) {
  if (this.items && this.items.length > 0) {
    let total = 0;
    this.items.forEach((item) => {
      item.totalAmount = item.quantity * item.rate;
      total += item.totalAmount;
    });
    this.totalAmount = total;
  } else if (this.quantity && this.rate) {
    this.totalAmount = this.quantity * this.rate;
  }
  
  this.pendingAmount = this.totalAmount - this.receivedAmount - (this.deduction || 0);

  if (this.receivedAmount === 0 && (this.deduction || 0) === 0) {
    this.paymentStatus = 'Pending';
  } else if (this.receivedAmount + (this.deduction || 0) >= this.totalAmount) {
    this.paymentStatus = 'Paid';
  } else {
    this.paymentStatus = 'Partially Paid';
  }
  
  next();
});

saleSchema.index({ invoiceNumber: 1, user: 1 }, { unique: true });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
