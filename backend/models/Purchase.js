import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
    },
    purchaseCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseCompany',
      required: [true, 'Purchase company is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
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
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
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

// Pre-validate hook to calculate total, remainingQuantity, and pendingAmount
purchaseSchema.pre('validate', function (next) {
  if (this.quantity && this.rate) {
    this.totalAmount = this.quantity * this.rate;
  }
  
  if (this.isNew) {
    this.remainingQuantity = this.quantity - this.soldQuantity;
    this.pendingAmount = this.totalAmount - this.paidAmount;
  }
  
  next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
