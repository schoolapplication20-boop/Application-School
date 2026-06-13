import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import {
  ORDER_STATUS, DELIVERY_TYPES, PAYMENT_METHODS, PAYMENT_STATUS,
} from '../utils/constants.js';

const Order = sequelize.define('Order', {
  orderId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'order_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'customer_id',
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'order_number',
  },
  whatsappMessageId: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_message_id',
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: ORDER_STATUS.PENDING,
    validate: { isIn: [Object.values(ORDER_STATUS)] },
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'tax_amount',
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'delivery_fee',
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'discount_amount',
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'total_amount',
  },
  deliveryType: {
    type: DataTypes.STRING(50),
    field: 'delivery_type',
    validate: { isIn: [Object.values(DELIVERY_TYPES)] },
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    field: 'delivery_address',
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    field: 'payment_method',
    validate: { isIn: [Object.values(PAYMENT_METHODS)] },
  },
  paymentStatus: {
    type: DataTypes.STRING(50),
    defaultValue: PAYMENT_STATUS.PENDING,
    field: 'payment_status',
    validate: { isIn: [Object.values(PAYMENT_STATUS)] },
  },
  notes: DataTypes.TEXT,
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
  },
}, {
  tableName: 'wa_orders',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['business_id', 'order_number'] },
  ],
});

export default Order;
