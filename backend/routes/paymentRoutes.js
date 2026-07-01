import express from 'express';
import {
  getPayments,
  createPayment,
  deletePayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getPayments).post(createPayment);
router.route('/:id').delete(deletePayment);

export default router;
