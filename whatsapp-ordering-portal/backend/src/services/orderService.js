import { Op } from 'sequelize';
import { Order, OrderItem, Customer } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  ERROR_CODES, HTTP_STATUS, PAGINATION, ORDER_STATUS,
} from '../utils/constants.js';

const ORDER_ACTIONS = {
  accept: {
    allowedFrom: [ORDER_STATUS.PENDING],
    newStatus: ORDER_STATUS.ACCEPTED,
  },
  reject: {
    allowedFrom: [ORDER_STATUS.PENDING],
    newStatus: ORDER_STATUS.CANCELED,
  },
  prepare: {
    allowedFrom: [ORDER_STATUS.ACCEPTED],
    newStatus: ORDER_STATUS.PREPARING,
  },
  ready: {
    allowedFrom: [ORDER_STATUS.PREPARING],
    newStatus: ORDER_STATUS.READY,
  },
  deliver: {
    allowedFrom: [ORDER_STATUS.READY],
    newStatus: ORDER_STATUS.DELIVERED,
  },
  complete: {
    allowedFrom: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.DELIVERED],
    newStatus: ORDER_STATUS.COMPLETED,
    setCompletedAt: true,
  },
  cancel: {
    allowedFrom: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY],
    newStatus: ORDER_STATUS.CANCELED,
  },
};

const formatOrderCustomer = (customer) => ({
  customer_id: customer.customerId,
  customer_name: customer.customerName,
  whatsapp_number: customer.whatsappNumber,
  phone_number: customer.phoneNumber,
});

const formatOrderItem = (item) => ({
  order_item_id: item.orderItemId,
  product_id: item.productId,
  product_name: item.productName,
  quantity: item.quantity,
  unit_price: item.unitPrice,
  total_price: item.totalPrice,
  addons: item.addonsJson,
  special_instructions: item.specialInstructions,
});

export const formatOrder = (order) => ({
  order_id: order.orderId,
  business_id: order.businessId,
  customer_id: order.customerId,
  order_number: order.orderNumber,
  whatsapp_message_id: order.whatsappMessageId,
  status: order.status,
  subtotal: order.subtotal,
  tax_amount: order.taxAmount,
  delivery_fee: order.deliveryFee,
  discount_amount: order.discountAmount,
  total_amount: order.totalAmount,
  delivery_type: order.deliveryType,
  delivery_address: order.deliveryAddress,
  payment_method: order.paymentMethod,
  payment_status: order.paymentStatus,
  payment_link_url: order.paymentLinkUrl,
  razorpay_payment_id: order.razorpayPaymentId,
  notes: order.notes,
  completed_at: order.completedAt,
  created_at: order.createdAt,
  updated_at: order.updatedAt,
  ...(order.customer && { customer: formatOrderCustomer(order.customer) }),
  ...(order.items && { items: order.items.map(formatOrderItem) }),
});

const findOwnedOrder = async (businessId, orderId, options = {}) => {
  const order = await Order.findOne({ where: { orderId, businessId }, ...options });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Order not found');
  }
  return order;
};

export const listOrders = async (businessId, query) => {
  const page = Math.max(Number(query.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(Number(query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const where = { businessId };

  if (query.status) where.status = query.status;
  if (query.payment_status) where.paymentStatus = query.payment_status;
  if (query.delivery_type) where.deliveryType = query.delivery_type;
  if (query.customer_id) where.customerId = query.customer_id;

  if (query.search) {
    where.orderNumber = { [Op.iLike]: `%${query.search}%` };
  }

  if (query.from_date || query.to_date) {
    where.createdAt = {};
    if (query.from_date) where.createdAt[Op.gte] = new Date(query.from_date);
    if (query.to_date) where.createdAt[Op.lte] = new Date(query.to_date);
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [{ model: Customer, as: 'customer' }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    orders: rows.map(formatOrder),
    pagination: {
      page, limit, total: count, total_pages: Math.ceil(count / limit),
    },
  };
};

export const getOrder = async (businessId, orderId) => {
  const order = await findOwnedOrder(businessId, orderId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: OrderItem, as: 'items' },
    ],
  });
  return { order: formatOrder(order) };
};

export const updateOrderStatus = async (businessId, orderId, action) => {
  const config = ORDER_ACTIONS[action];
  if (!config) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Invalid order action');
  }

  const order = await findOwnedOrder(businessId, orderId);

  if (!config.allowedFrom.includes(order.status)) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.VALIDATION_ERROR,
      `Cannot ${action} an order with status ${order.status}`,
    );
  }

  order.status = config.newStatus;
  if (config.setCompletedAt) order.completedAt = new Date();

  await order.save();
  return { order: formatOrder(order) };
};

export default {
  formatOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
};
