import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Session = sequelize.define('Session', {
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'session_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.STRING(500),
    field: 'user_agent',
  },
  loginAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'login_at',
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_activity_at',
  },
  logoutAt: {
    type: DataTypes.DATE,
    field: 'logout_at',
  },
}, {
  tableName: 'wa_sessions',
  timestamps: false,
});

export default Session;
