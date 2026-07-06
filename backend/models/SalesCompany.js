import mongoose from 'mongoose';

const salesCompanySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    gstNumber: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    totals: {
      salesAmount: { type: Number, default: 0 },
      receivedAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

salesCompanySchema.index({ name: 1, user: 1 }, { unique: true });

const SalesCompany = mongoose.model('SalesCompany', salesCompanySchema);

export default SalesCompany;
