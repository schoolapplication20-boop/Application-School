import {
  Op, fn, col, literal,
} from 'sequelize';
import { Order, OrderItem, Customer } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import { ERROR_CODES, HTTP_STATUS, ORDER_STATUS } from '../utils/constants.js';

const EXCLUDED_FROM_COUNTS = [ORDER_STATUS.CART];
const EXCLUDED_FROM_REVENUE = [ORDER_STATUS.CART, ORDER_STATUS.CANCELED, ORDER_STATUS.REFUNDED];
const VALID_PERIODS = ['day', 'week', 'month'];

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatOrderSummary = (order) => ({
  order_id: order.orderId,
  order_number: order.orderNumber,
  status: order.status,
  total_amount: order.totalAmount,
  payment_status: order.paymentStatus,
  created_at: order.createdAt,
});

export const getDashboardStats = async (businessId) => {
  const today = startOfToday();

  const [totalOrders, pendingOrders, totalCustomers, todayOrders] = await Promise.all([
    Order.count({ where: { businessId, status: { [Op.notIn]: EXCLUDED_FROM_COUNTS } } }),
    Order.count({ where: { businessId, status: ORDER_STATUS.PENDING } }),
    Customer.count({ where: { businessId } }),
    Order.count({ where: { businessId, status: { [Op.notIn]: EXCLUDED_FROM_COUNTS }, createdAt: { [Op.gte]: today } } }),
  ]);

  const [totalRevenueResult, todayRevenueResult] = await Promise.all([
    Order.findOne({
      where: { businessId, status: { [Op.notIn]: EXCLUDED_FROM_REVENUE } },
      attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total']],
      raw: true,
    }),
    Order.findOne({
      where: { businessId, status: { [Op.notIn]: EXCLUDED_FROM_REVENUE }, createdAt: { [Op.gte]: today } },
      attributes: [[fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total']],
      raw: true,
    }),
  ]);

  const recentOrders = await Order.findAll({
    where: { businessId },
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  const topProducts = await OrderItem.findAll({
    attributes: [
      'productId',
      'productName',
      [fn('SUM', col('quantity')), 'total_quantity'],
      [fn('SUM', col('total_price')), 'total_revenue'],
    ],
    include: [{
      model: Order,
      as: 'order',
      attributes: [],
      where: { businessId, status: { [Op.notIn]: EXCLUDED_FROM_REVENUE } },
    }],
    group: ['OrderItem.product_id', 'OrderItem.product_name'],
    order: [[literal('total_quantity'), 'DESC']],
    limit: 5,
    raw: true,
  });

  return {
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    total_customers: totalCustomers,
    total_revenue: Number(totalRevenueResult?.total || 0),
    today_orders: todayOrders,
    today_revenue: Number(todayRevenueResult?.total || 0),
    recent_orders: recentOrders.map(formatOrderSummary),
    top_products: topProducts.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      total_quantity: Number(item.total_quantity),
      total_revenue: Number(item.total_revenue),
    })),
  };
};

const resolveDateRange = (query) => {
  const toDate = query.to_date ? new Date(query.to_date) : new Date();
  const fromDate = query.from_date ? new Date(query.from_date) : new Date(toDate);

  if (!query.from_date) {
    fromDate.setDate(fromDate.getDate() - 29);
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
};

export const getSalesData = async (businessId, query) => {
  const period = query.period || 'day';
  if (!VALID_PERIODS.includes(period)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, `period must be one of: ${VALID_PERIODS.join(', ')}`);
  }

  const { fromDate, toDate } = resolveDateRange(query);

  const rows = await Order.findAll({
    where: {
      businessId,
      status: { [Op.notIn]: EXCLUDED_FROM_REVENUE },
      createdAt: { [Op.between]: [fromDate, toDate] },
    },
    attributes: [
      [fn('DATE_TRUNC', period, col('created_at')), 'period'],
      [fn('COUNT', col('order_id')), 'orders'],
      [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'revenue'],
    ],
    group: [fn('DATE_TRUNC', period, col('created_at'))],
    order: [[fn('DATE_TRUNC', period, col('created_at')), 'ASC']],
    raw: true,
  });

  return {
    period,
    from_date: fromDate.toISOString(),
    to_date: toDate.toISOString(),
    sales: rows.map((row) => ({
      date: row.period,
      orders: Number(row.orders),
      revenue: Number(row.revenue),
    })),
  };
};

export const getOrderTrends = async (businessId, query) => {
  const { fromDate, toDate } = resolveDateRange(query);

  const statusRows = await Order.findAll({
    where: { businessId, createdAt: { [Op.between]: [fromDate, toDate] } },
    attributes: ['status', [fn('COUNT', col('order_id')), 'count']],
    group: ['status'],
    raw: true,
  });

  const dailyRows = await Order.findAll({
    where: {
      businessId,
      status: { [Op.notIn]: EXCLUDED_FROM_COUNTS },
      createdAt: { [Op.between]: [fromDate, toDate] },
    },
    attributes: [
      [fn('DATE_TRUNC', 'day', col('created_at')), 'date'],
      [fn('COUNT', col('order_id')), 'orders'],
    ],
    group: [fn('DATE_TRUNC', 'day', col('created_at'))],
    order: [[fn('DATE_TRUNC', 'day', col('created_at')), 'ASC']],
    raw: true,
  });

  return {
    from_date: fromDate.toISOString(),
    to_date: toDate.toISOString(),
    status_breakdown: statusRows.map((row) => ({ status: row.status, count: Number(row.count) })),
    daily_orders: dailyRows.map((row) => ({ date: row.date, orders: Number(row.orders) })),
  };
};

export default {
  getDashboardStats,
  getSalesData,
  getOrderTrends,
};
