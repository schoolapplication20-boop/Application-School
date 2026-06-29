import { Category, Product, ProductAddon } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import { ERROR_CODES, HTTP_STATUS, PAGINATION } from '../utils/constants.js';

export const formatCategory = (category) => ({
  category_id: category.categoryId,
  business_id: category.businessId,
  category_name: category.categoryName,
  display_order: category.displayOrder,
  icon_url: category.iconUrl,
  is_active: category.isActive,
  created_at: category.createdAt,
  updated_at: category.updatedAt,
});

export const formatAddon = (addon) => ({
  addon_id: addon.addonId,
  product_id: addon.productId,
  addon_name: addon.addonName,
  addon_price: addon.addonPrice,
  is_required: addon.isRequired,
  display_order: addon.displayOrder,
});

export const formatProduct = (product) => ({
  product_id: product.productId,
  business_id: product.businessId,
  category_id: product.categoryId,
  product_name: product.productName,
  description: product.description,
  price: product.price,
  image_url: product.imageUrl,
  is_available: product.isAvailable,
  stock_quantity: product.stockQuantity,
  track_inventory: product.trackInventory,
  low_stock_threshold: product.lowStockThreshold,
  tax_percentage: product.taxPercentage,
  preparation_time_minutes: product.preparationTimeMinutes,
  tags: product.tags,
  addons: (product.addons || []).map(formatAddon),
  created_at: product.createdAt,
  updated_at: product.updatedAt,
});

const findOwnedCategory = async (businessId, categoryId) => {
  const category = await Category.findOne({ where: { categoryId, businessId } });
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Category not found');
  }
  return category;
};

const findOwnedProduct = async (businessId, productId, options = {}) => {
  const product = await Product.findOne({ where: { productId, businessId }, ...options });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Product not found');
  }
  return product;
};

export const listCategories = async (businessId) => {
  const categories = await Category.findAll({
    where: { businessId },
    order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
  });
  return { categories: categories.map(formatCategory) };
};

export const createCategory = async (businessId, body) => {
  const category = await Category.create({
    businessId,
    categoryName: body.category_name,
    displayOrder: body.display_order ?? 0,
    iconUrl: body.icon_url,
    isActive: body.is_active ?? true,
  });
  return { category: formatCategory(category) };
};

export const updateCategory = async (businessId, categoryId, body) => {
  const category = await findOwnedCategory(businessId, categoryId);

  if (body.category_name !== undefined) category.categoryName = body.category_name;
  if (body.display_order !== undefined) category.displayOrder = body.display_order;
  if (body.icon_url !== undefined) category.iconUrl = body.icon_url;
  if (body.is_active !== undefined) category.isActive = body.is_active;

  await category.save();
  return { category: formatCategory(category) };
};

export const deleteCategory = async (businessId, categoryId) => {
  const category = await findOwnedCategory(businessId, categoryId);
  await category.destroy();
  return { deleted: true };
};

export const listProducts = async (businessId, query) => {
  const page = Math.max(Number(query.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(Number(query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const where = { businessId };

  if (query.category_id) where.categoryId = query.category_id;
  if (query.is_available !== undefined) where.isAvailable = query.is_available === 'true';

  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: ProductAddon, as: 'addons' }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return {
    products: rows.map(formatProduct),
    pagination: {
      page, limit, total: count, total_pages: Math.ceil(count / limit),
    },
  };
};

export const getProduct = async (businessId, productId) => {
  const product = await findOwnedProduct(businessId, productId, {
    include: [{ model: ProductAddon, as: 'addons' }],
  });
  return { product: formatProduct(product) };
};

export const createProduct = async (businessId, body) => {
  await findOwnedCategory(businessId, body.category_id);

  const product = await Product.create({
    businessId,
    categoryId: body.category_id,
    productName: body.product_name,
    description: body.description,
    price: body.price,
    imageUrl: body.image_url,
    isAvailable: body.is_available ?? true,
    stockQuantity: body.stock_quantity,
    taxPercentage: body.tax_percentage ?? 0,
    preparationTimeMinutes: body.preparation_time_minutes,
    tags: body.tags,
  });

  return { product: formatProduct(product) };
};

export const updateProduct = async (businessId, productId, body) => {
  const product = await findOwnedProduct(businessId, productId, {
    include: [{ model: ProductAddon, as: 'addons' }],
  });

  if (body.category_id !== undefined) {
    await findOwnedCategory(businessId, body.category_id);
    product.categoryId = body.category_id;
  }
  if (body.product_name !== undefined) product.productName = body.product_name;
  if (body.description !== undefined) product.description = body.description;
  if (body.price !== undefined) product.price = body.price;
  if (body.image_url !== undefined) product.imageUrl = body.image_url;
  if (body.is_available !== undefined) product.isAvailable = body.is_available;
  if (body.stock_quantity !== undefined) product.stockQuantity = body.stock_quantity;
  if (body.track_inventory !== undefined) product.trackInventory = body.track_inventory;
  if (body.low_stock_threshold !== undefined) product.lowStockThreshold = body.low_stock_threshold;
  if (body.tax_percentage !== undefined) product.taxPercentage = body.tax_percentage;
  if (body.preparation_time_minutes !== undefined) product.preparationTimeMinutes = body.preparation_time_minutes;
  if (body.tags !== undefined) product.tags = body.tags;

  await product.save();
  return { product: formatProduct(product) };
};

export const deleteProduct = async (businessId, productId) => {
  const product = await findOwnedProduct(businessId, productId);
  await product.destroy();
  return { deleted: true };
};

export const addAddon = async (businessId, productId, body) => {
  await findOwnedProduct(businessId, productId);

  const addon = await ProductAddon.create({
    productId,
    addonName: body.addon_name,
    addonPrice: body.addon_price,
    isRequired: body.is_required ?? false,
    displayOrder: body.display_order ?? 0,
  });

  return { addon: formatAddon(addon) };
};

export const updateAddon = async (businessId, productId, addonId, body) => {
  await findOwnedProduct(businessId, productId);

  const addon = await ProductAddon.findOne({ where: { addonId, productId } });
  if (!addon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Add-on not found');
  }

  if (body.addon_name !== undefined) addon.addonName = body.addon_name;
  if (body.addon_price !== undefined) addon.addonPrice = body.addon_price;
  if (body.is_required !== undefined) addon.isRequired = body.is_required;
  if (body.display_order !== undefined) addon.displayOrder = body.display_order;

  await addon.save();
  return { addon: formatAddon(addon) };
};

export const deleteAddon = async (businessId, productId, addonId) => {
  await findOwnedProduct(businessId, productId);

  const addon = await ProductAddon.findOne({ where: { addonId, productId } });
  if (!addon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Add-on not found');
  }

  await addon.destroy();
  return { deleted: true };
};

export default {
  formatCategory,
  formatProduct,
  formatAddon,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addAddon,
  updateAddon,
  deleteAddon,
};
