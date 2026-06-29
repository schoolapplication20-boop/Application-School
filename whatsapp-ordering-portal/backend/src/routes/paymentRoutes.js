import { Router } from 'express';
import { param } from 'express-validator';
import { validationErrorHandler } from '../middleware/validation.js';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

// Each restaurant registers their own webhook URL:
//   POST /api/v1/payments/webhook/razorpay/:businessId
// HMAC is verified using that business's stored webhookSecret.
router.post(
  '/webhook/razorpay/:businessId',
  [param('businessId').isUUID().withMessage('Invalid business ID')],
  validationErrorHandler,
  paymentController.razorpayWebhook,
);

export default router;
