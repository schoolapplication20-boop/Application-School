import { Router } from 'express';
import { query } from 'express-validator';
import * as analyticsController from '../controllers/analyticsController.js';
import { validationErrorHandler } from '../middleware/validation.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireBusiness } from '../middleware/requireBusiness.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/dashboard', analyticsController.getDashboardStats);

const dateRangeValidators = [
  query('period').optional().isIn(['day', 'week', 'month']),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601(),
];

router.get('/sales', dateRangeValidators, validationErrorHandler, analyticsController.getSalesData);

router.get('/orders', dateRangeValidators, validationErrorHandler, analyticsController.getOrderTrends);

export default router;
