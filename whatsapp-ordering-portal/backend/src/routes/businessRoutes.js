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

router.get(
  '/me',
  authenticate,
  businessController.getMyBusiness,
);

router.get(
  '/qr-codes',
  authenticate,
  requireBusiness,
  businessController.listQrCodes,
);

router.post(
  '/qr-codes',
  authenticate,
  requireBusiness,
  [
    body('label').trim().notEmpty().withMessage('label is required'),
    body('type').isIn(['ordering', 'table', 'whatsapp']).withMessage('Invalid QR type'),
    body('value').trim().notEmpty().withMessage('value is required'),
  ],
  validationErrorHandler,
  businessController.createQrCode,
);

router.delete(
  '/qr-codes/:qrCodeId',
  authenticate,
  requireBusiness,
  businessController.deleteQrCode,
);

router.patch(
  '/hours',
  authenticate,
  requireBusiness,
  businessController.updateBusinessHours,
);

router.patch(
  '/delivery',
  authenticate,
  requireBusiness,
  businessController.updateDeliverySettings,
);

router.patch(
  '/tax',
  authenticate,
  requireBusiness,
  businessController.updateTaxSettings,
);

router.patch(
  '/payments',
  authenticate,
  requireBusiness,
  businessController.updatePaymentSettings,
);

router.patch(
  '/logo-url',
  authenticate,
  requireBusiness,
  [body('logoUrl').notEmpty().withMessage('logoUrl is required')],
  validationErrorHandler,
  businessController.updateLogoUrl,
);

router.patch(
  '/theme',
  authenticate,
  requireBusiness,
  businessController.updateThemeSettings,
);

router.patch(
  '/onboarding-complete',
  authenticate,
  requireBusiness,
  businessController.completeOnboarding,
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
