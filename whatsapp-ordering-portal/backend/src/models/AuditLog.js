import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { AUDIT_STATUS } from '../utils/constants.js';

const AuditLog = sequelize.define('AuditLog', {
  logId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'log_id',
  },
  businessId: {
    type: DataTypes.UUID,
    field: 'business_id',
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
  },
  action: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  entityType: {
    type: DataTypes.STRING(100),
    field: 'entity_type',
  },
  entityId: {
    type: DataTypes.STRING(255),
    field: 'entity_id',
  },
  changes: DataTypes.JSONB,
  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
  status: {
    type: DataTypes.STRING(50),
    validate: { isIn: [Object.values(AUDIT_STATUS)] },
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message',
  },
}, {
  tableName: 'wa_audit_logs',
  updatedAt: false,
});

export default AuditLog;
