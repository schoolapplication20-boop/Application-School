import { Router } from 'express';
import { body, param } from 'express-validator';
import * as productController from '../controllers/productController.js';
import { validators, validationErrorHandler } from '../middleware/validation.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireBusiness } from '../middleware/requireBusiness.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/categories', productController.listCategories);

router.post(
  '/categories',
  [
    body('category_name').trim().isLength({ min: 1, max: 255 }).withMessage('category_name is required'),
    body('display_order').optional().isInt({ min: 0 }),
    body('icon_url').optional().isString(),
    body('is_active').optional().isBoolean(),
  ],
  validationErrorHandler,
  productController.createCategory,
);

router.put(
  '/categories/:categoryId',
  [
    param('categoryId').isUUID().withMessage('Invalid category ID'),
    body('category_name').optional().trim().isLength({ min: 1, max: 255 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('icon_url').optional().isString(),
    body('is_active').optional().isBoolean(),
  ],
  validationErrorHandler,
  productController.updateCategory,
);

router.delete(
  '/categories/:categoryId',
  [param('categoryId').isUUID().withMessage('Invalid category ID')],
  validationErrorHandler,
  productController.deleteCategory,
);

router.get('/', productController.listProducts);

router.get(
  '/:productId',
  [param('productId').isUUID().withMessage('Invalid product ID')],
  validationErrorHandler,
  productController.getProduct,
);

router.post(
  '/',
  [
    validators.productName(),
    validators.price(),
    body('category_id').isUUID().withMessage('category_id is required'),
    body('description').optional().isString(),
    body('image_url').optional().isString(),
    body('is_available').optional().isBoolean(),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('tax_percentage').optional().isFloat({ min: 0 }),
    body('preparation_time_minutes').optional().isInt({ min: 0 }),
    body('tags').optional().isArray(),
  ],
  validationErrorHandler,
  productController.createProduct,
);

router.put(
  '/:productId',
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    body('category_id').optional().isUUID(),
    body('product_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('image_url').optional().isString(),
    body('is_available').optional().isBoolean(),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('tax_percentage').optional().isFloat({ min: 0 }),
    body('preparation_time_minutes').optional().isInt({ min: 0 }),
    body('tags').optional().isArray(),
  ],
  validationErrorHandler,
  productController.updateProduct,
);

router.delete(
  '/:productId',
  [param('productId').isUUID().withMessage('Invalid product ID')],
  validationErrorHandler,
  productController.deleteProduct,
);

router.post(
  '/:productId/addons',
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    body('addon_name').trim().isLength({ min: 1, max: 255 }).withMessage('addon_name is required'),
    body('addon_price').isFloat({ min: 0 }).withMessage('addon_price must be a positive number'),
    body('is_required').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validationErrorHandler,
  productController.addAddon,
);

router.put(
  '/:productId/addons/:addonId',
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    param('addonId').isUUID().withMessage('Invalid addon ID'),
    body('addon_name').optional().trim().isLength({ min: 1, max: 255 }),
    body('addon_price').optional().isFloat({ min: 0 }),
    body('is_required').optional().isBoolean(),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validationErrorHandler,
  productController.updateAddon,
);

router.delete(
  '/:productId/addons/:addonId',
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    param('addonId').isUUID().withMessage('Invalid addon ID'),
  ],
  validationErrorHandler,
  productController.deleteAddon,
);

export default router;
