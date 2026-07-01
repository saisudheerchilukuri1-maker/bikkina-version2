import express from 'express';
import {
  getPurchaseCompanies,
  createPurchaseCompany,
  updatePurchaseCompany,
  deletePurchaseCompany,
  getPurchaseCompanyLedger,
} from '../controllers/purchaseCompanyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getPurchaseCompanies).post(createPurchaseCompany);
router.route('/:id').put(updatePurchaseCompany).delete(deletePurchaseCompany);
router.route('/:id/ledger').get(getPurchaseCompanyLedger);

export default router;
