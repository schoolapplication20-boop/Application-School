import { asyncHandler } from '../middleware/errorHandler.js';
import * as customerService from '../services/customerService.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Customers retrieved' });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomer(req.user.businessId, req.params.customerId);
  res.status(200).json({ success: true, data: result, message: 'Customer retrieved' });
});

export default {
  listCustomers,
  getCustomer,
};
