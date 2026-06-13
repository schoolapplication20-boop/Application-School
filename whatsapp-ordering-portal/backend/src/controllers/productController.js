import { asyncHandler } from '../middleware/errorHandler.js';
import * as productService from '../services/productService.js';

export const listCategories = asyncHandler(async (req, res) => {
  const result = await productService.listCategories(req.user.businessId);
  res.status(200).json({ success: true, data: result, message: 'Categories retrieved' });
});

export const createCategory = asyncHandler(async (req, res) => {
  const result = await productService.createCategory(req.user.businessId, req.body);
  res.status(201).json({ success: true, data: result, message: 'Category created' });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const result = await productService.updateCategory(req.user.businessId, req.params.categoryId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Category updated' });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await productService.deleteCategory(req.user.businessId, req.params.categoryId);
  res.status(200).json({ success: true, data: result, message: 'Category deleted' });
});

export const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Products retrieved' });
});

export const getProduct = asyncHandler(async (req, res) => {
  const result = await productService.getProduct(req.user.businessId, req.params.productId);
  res.status(200).json({ success: true, data: result, message: 'Product retrieved' });
});

export const createProduct = asyncHandler(async (req, res) => {
  const result = await productService.createProduct(req.user.businessId, req.body);
  res.status(201).json({ success: true, data: result, message: 'Product created' });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProduct(req.user.businessId, req.params.productId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Product updated' });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.user.businessId, req.params.productId);
  res.status(200).json({ success: true, data: result, message: 'Product deleted' });
});

export const addAddon = asyncHandler(async (req, res) => {
  const result = await productService.addAddon(req.user.businessId, req.params.productId, req.body);
  res.status(201).json({ success: true, data: result, message: 'Add-on created' });
});

export const updateAddon = asyncHandler(async (req, res) => {
  const result = await productService.updateAddon(req.user.businessId, req.params.productId, req.params.addonId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Add-on updated' });
});

export const deleteAddon = asyncHandler(async (req, res) => {
  const result = await productService.deleteAddon(req.user.businessId, req.params.productId, req.params.addonId);
  res.status(200).json({ success: true, data: result, message: 'Add-on deleted' });
});

export default {
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
