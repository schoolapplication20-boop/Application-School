import { Router } from 'express';
import { param, query } from 'express-validator';
import * as notificationController from '../controllers/notificationController.js';
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
    query('is_read').optional().isBoolean(),
  ],
  validationErrorHandler,
  notificationController.listNotifications,
);

router.put('/read-all', notificationController.markAllAsRead);

router.put(
  '/:notificationId/read',
  [param('notificationId').isUUID().withMessage('Invalid notification ID')],
  validationErrorHandler,
  notificationController.markAsRead,
);

export default router;
