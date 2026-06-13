import { Op } from 'sequelize';
import { Customer, Order } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import { ERROR_CODES, HTTP_STATUS, PAGINATION } from '../utils/constants.js';

export const formatCustomer = (customer) => ({
  customer_id: customer.customerId,
  business_id: customer.businessId,
  whatsapp_number: customer.whatsappNumber,
  customer_name: customer.customerName,
  phone_number: customer.phoneNumber,
  email: customer.email,
  address: customer.address,
  delivery_location_lat: customer.deliveryLocationLat,
  delivery_location_lng: customer.deliveryLocationLng,
  total_orders: customer.totalOrders,
  total_spent: customer.totalSpent,
  last_order_at: customer.lastOrderAt,
  created_at: customer.createdAt,
  updated_at: customer.updatedAt,
});

const formatOrderSummary = (order) => ({
  order_id: order.orderId,
  order_number: order.orderNumber,
  status: order.status,
  total_amount: order.totalAmount,
  payment_status: order.paymentStatus,
  created_at: order.createdAt,
});

const findOwnedCustomer = async (businessId, customerId) => {
  const customer = await Customer.findOne({ where: { customerId, businessId } });
  if (!customer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Customer not found');
  }
  return customer;
};

export const listCustomers = async (businessId, query) => {
  const page = Math.max(Number(query.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(Number(query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const where = { businessId };

  if (query.search) {
    const search = `%${query.search}%`;
    where[Op.or] = [
      { customerName: { [Op.iLike]: search } },
      { whatsappNumber: { [Op.iLike]: search } },
      { phoneNumber: { [Op.iLike]: search } },
    ];
  }

  const { count, rows } = await Customer.findAndCountAll({
    where,
    order: [['lastOrderAt', 'DESC'], ['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    customers: rows.map(formatCustomer),
    pagination: {
      page, limit, total: count, total_pages: Math.ceil(count / limit),
    },
  };
};

export const getCustomer = async (businessId, customerId) => {
  const customer = await findOwnedCustomer(businessId, customerId);

  const recentOrders = await Order.findAll({
    where: { businessId, customerId },
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  return {
    customer: formatCustomer(customer),
    recent_orders: recentOrders.map(formatOrderSummary),
  };
};

export default {
  formatCustomer,
  listCustomers,
  getCustomer,
};
