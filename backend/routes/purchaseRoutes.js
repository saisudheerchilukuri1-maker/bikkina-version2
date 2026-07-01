import express from 'express';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getPurchases).post(createPurchase);
router.route('/:id').put(updatePurchase).delete(deletePurchase);

export default router;
