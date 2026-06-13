import { Router } from 'express';
import { param, query } from 'express-validator';
import * as customerController from '../controllers/customerController.js';
import { validationErrorHandler } from '../middleware/validation.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireBusiness } from '../middleware/requireBusiness.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    query('search').optional().isString(),
  ],
  validationErrorHandler,
  customerController.listCustomers,
);

router.get(
  '/:customerId',
  [param('customerId').isUUID().withMessage('Invalid customer ID')],
  validationErrorHandler,
  customerController.getCustomer,
);

export default router;
