import sequelize from '../config/database.js';
import User from './User.js';
import OtpToken from './OtpToken.js';
import EmailVerificationToken from './EmailVerificationToken.js';
import Session from './Session.js';
import Business from './Business.js';
import WhatsappConfig from './WhatsappConfig.js';
import Category from './Category.js';
import Product from './Product.js';
import ProductAddon from './ProductAddon.js';
import Customer from './Customer.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import ChatSession from './ChatSession.js';
import AuditLog from './AuditLog.js';
import Notification from './Notification.js';
import MessageTemplate from './MessageTemplate.js';

// User <-> auth/audit records
User.hasMany(OtpToken, { foreignKey: 'userId', as: 'otpTokens', onDelete: 'CASCADE' });
OtpToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(EmailVerificationToken, { foreignKey: 'userId', as: 'emailVerificationToken', onDelete: 'CASCADE' });
EmailVerificationToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Session, { foreignKey: 'userId', as: 'sessions', onDelete: 'CASCADE' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Business, { foreignKey: 'userId', as: 'businesses', onDelete: 'CASCADE' });
Business.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Business <-> WhatsApp config
Business.hasOne(WhatsappConfig, { foreignKey: 'businessId', as: 'whatsappConfig', onDelete: 'CASCADE' });
WhatsappConfig.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

// Business <-> Categories/Products
Business.hasMany(Category, { foreignKey: 'businessId', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Product, { foreignKey: 'businessId', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(ProductAddon, { foreignKey: 'productId', as: 'addons', onDelete: 'CASCADE' });
ProductAddon.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Business <-> Customers/Orders
Business.hasMany(Customer, { foreignKey: 'businessId', as: 'customers', onDelete: 'CASCADE' });
Customer.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Order, { foreignKey: 'businessId', as: 'orders', onDelete: 'CASCADE' });
Order.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Customer.hasMany(Order, { foreignKey: 'customerId', as: 'orders', onDelete: 'CASCADE' });
Order.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Chat sessions
Business.hasMany(ChatSession, { foreignKey: 'businessId', as: 'chatSessions', onDelete: 'CASCADE' });
ChatSession.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Customer.hasMany(ChatSession, { foreignKey: 'customerId', as: 'chatSessions', onDelete: 'CASCADE' });
ChatSession.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

Order.hasMany(ChatSession, { foreignKey: 'orderId', as: 'chatSessions', onDelete: 'SET NULL' });
ChatSession.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Audit logs / notifications / templates
Business.hasMany(AuditLog, { foreignKey: 'businessId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(Notification, { foreignKey: 'businessId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

Business.hasMany(MessageTemplate, { foreignKey: 'businessId', as: 'messageTemplates', onDelete: 'CASCADE' });
MessageTemplate.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

export {
  sequelize,
  User,
  OtpToken,
  EmailVerificationToken,
  Session,
  Business,
  WhatsappConfig,
  Category,
  Product,
  ProductAddon,
  Customer,
  Order,
  OrderItem,
  ChatSession,
  AuditLog,
  Notification,
  MessageTemplate,
};
