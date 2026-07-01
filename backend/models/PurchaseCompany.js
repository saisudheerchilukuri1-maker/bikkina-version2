import mongoose from 'mongoose';

const purchaseCompanySchema = new mongoose.Schema(
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
    gstNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    totals: {
      purchaseAmount: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      quantityPurchased: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const PurchaseCompany = mongoose.model('PurchaseCompany', purchaseCompanySchema);

export default PurchaseCompany;
