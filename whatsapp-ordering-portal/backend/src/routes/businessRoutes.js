import { Router } from 'express';
import { body } from 'express-validator';
import * as businessController from '../controllers/businessController.js';
import { validate, validators, validationErrorHandler } from '../middleware/validation.js';
import { authenticate, verifyBusinessOwnership } from '../middleware/authMiddleware.js';
import { requireBusiness } from '../middleware/requireBusiness.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validate([validators.businessName(), validators.businessType()]),
  businessController.createBusiness,
);

router.get(
  '/whatsapp/config',
  authenticate,
  requireBusiness,
  businessController.getWhatsappConfig,
);

router.post(
  '/whatsapp/setup',
  authenticate,
  requireBusiness,
  [
    body('phone_number_id').notEmpty().withMessage('phone_number_id is required'),
    body('access_token').notEmpty().withMessage('access_token is required'),
    body('whatsapp_business_account_id').optional().isString(),
    body('webhook_url').optional().isURL().withMessage('webhook_url must be a valid URL'),
    body('webhook_verify_token').optional().isString(),
  ],
  validationErrorHandler,
  businessController.setupWhatsappConfig,
);

router.put(
  '/whatsapp/config',
  authenticate,
  requireBusiness,
  [
    body('phone_number_id').optional().isString(),
    body('access_token').optional().isString(),
    body('whatsapp_business_account_id').optional().isString(),
    body('webhook_url').optional().isURL().withMessage('webhook_url must be a valid URL'),
    body('webhook_verify_token').optional().isString(),
    body('is_configured').optional().isBoolean(),
  ],
  validationErrorHandler,
  businessController.updateWhatsappConfig,
);

router.patch(
  '/hours',
  authenticate,
  requireBusiness,
  businessController.updateBusinessHours,
);

router.get(
  '/:businessId',
  authenticate,
  validators.businessIdParam(),
  validationErrorHandler,
  verifyBusinessOwnership,
  businessController.getBusiness,
);

router.put(
  '/:businessId',
  authenticate,
  validators.businessIdParam(),
  validationErrorHandler,
  verifyBusinessOwnership,
  businessController.updateBusiness,
);

export default router;
