import mongoose from 'mongoose';

const salesCompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
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

const SalesCompany = mongoose.model('SalesCompany', salesCompanySchema);

export default SalesCompany;
