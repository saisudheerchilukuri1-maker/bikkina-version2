import express from 'express';
import { getReportData } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getReportData);

export default router;
