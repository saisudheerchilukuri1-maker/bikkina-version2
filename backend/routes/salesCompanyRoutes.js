import express from 'express';
import {
  getSalesCompanies,
  createSalesCompany,
  updateSalesCompany,
  deleteSalesCompany,
  getSalesCompanyLedger,
} from '../controllers/salesCompanyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getSalesCompanies).post(createSalesCompany);
router.route('/:id').put(updateSalesCompany).delete(deleteSalesCompany);
router.route('/:id/ledger').get(getSalesCompanyLedger);

export default router;
