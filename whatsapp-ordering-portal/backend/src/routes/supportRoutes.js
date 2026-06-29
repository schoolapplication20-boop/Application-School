import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validationErrorHandler } from '../middleware/validation.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { sendIssueReport } from '../services/emailService.js';
import { Business, User } from '../models/index.js';
import logger from '../utils/logger.js';

const router = Router();

router.post(
  '/report-issue',
  authenticate,
  [
    body('issueType').isIn(['Bug', 'Feature Request', 'Question', 'Other']).withMessage('Invalid issue type'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),
  ],
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { issueType, description } = req.body;

    const [user, business] = await Promise.all([
      User.findByPk(req.user.userId),
      req.user.businessId ? Business.findByPk(req.user.businessId) : null,
    ]);

    const { sent } = await sendIssueReport({
      issueType,
      description,
      reporterEmail: user?.email,
      businessName: business?.businessName,
    });

    if (!sent) {
      logger.warn(`[support] Issue report email not sent (Resend not configured) from ${user?.email}`);
    }

    res.status(200).json({ success: true, message: 'Issue reported successfully. Thank you!' });
  }),
);

export default router;
