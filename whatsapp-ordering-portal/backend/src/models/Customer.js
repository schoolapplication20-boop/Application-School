import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Customer = sequelize.define('Customer', {
  customerId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'customer_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  whatsappNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'whatsapp_number',
  },
  customerName: {
    type: DataTypes.STRING(255),
    field: 'customer_name',
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    field: 'phone_number',
  },
  email: {
    type: DataTypes.STRING(255),
    validate: { isEmail: true },
  },
  address: DataTypes.TEXT,
  deliveryLocationLat: {
    type: DataTypes.DECIMAL(10, 8),
    field: 'delivery_location_lat',
  },
  deliveryLocationLng: {
    type: DataTypes.DECIMAL(11, 8),
    field: 'delivery_location_lng',
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_orders',
  },
  totalSpent: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'total_spent',
  },
  lastOrderAt: {
    type: DataTypes.DATE,
    field: 'last_order_at',
  },
}, {
  tableName: 'wa_customers',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['business_id', 'whatsapp_number'] },
  ],
});

export default Customer;
