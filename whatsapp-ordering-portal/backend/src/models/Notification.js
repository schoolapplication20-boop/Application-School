import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

const Notification = sequelize.define('Notification', {
  notificationId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'notification_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  notificationType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'notification_type',
    validate: { isIn: [Object.values(NOTIFICATION_TYPES)] },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read',
  },
  readAt: {
    type: DataTypes.DATE,
    field: 'read_at',
  },
}, {
  tableName: 'wa_notifications',
  updatedAt: false,
});

export default Notification;
