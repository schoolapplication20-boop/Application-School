import { Router } from 'express';
import { param, query } from 'express-validator';
import * as orderController from '../controllers/orderController.js';
import { validationErrorHandler } from '../middleware/validation.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireBusiness } from '../middleware/requireBusiness.js';
import { ORDER_STATUS, PAYMENT_STATUS, DELIVERY_TYPES } from '../utils/constants.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1 }),
    query('status').optional().isIn(Object.values(ORDER_STATUS)),
    query('payment_status').optional().isIn(Object.values(PAYMENT_STATUS)),
    query('delivery_type').optional().isIn(Object.values(DELIVERY_TYPES)),
    query('customer_id').optional().isUUID(),
    query('search').optional().isString(),
    query('from_date').optional().isISO8601(),
    query('to_date').optional().isISO8601(),
  ],
  validationErrorHandler,
  orderController.listOrders,
);

router.get(
  '/:orderId',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validationErrorHandler,
  orderController.getOrder,
);

router.post(
  '/:orderId/accept',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validationErrorHandler,
  orderController.acceptOrder,
);

router.post(
  '/:orderId/reject',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validationErrorHandler,
  orderController.rejectOrder,
);

router.post(
  '/:orderId/complete',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validationErrorHandler,
  orderController.completeOrder,
);

router.post(
  '/:orderId/cancel',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validationErrorHandler,
  orderController.cancelOrder,
);

export default router;
