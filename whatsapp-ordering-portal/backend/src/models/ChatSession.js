import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { SESSION_STATES } from '../utils/constants.js';

const ChatSession = sequelize.define('ChatSession', {
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'session_id',
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
  orderId: {
    type: DataTypes.UUID,
    field: 'order_id',
  },
  sessionState: {
    type: DataTypes.STRING(50),
    defaultValue: SESSION_STATES.MENU,
    field: 'session_state',
    validate: { isIn: [Object.values(SESSION_STATES)] },
  },
  sessionDataJson: {
    type: DataTypes.JSONB,
    field: 'session_data_json',
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    field: 'last_message_at',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  closedAt: {
    type: DataTypes.DATE,
    field: 'closed_at',
  },
}, {
  tableName: 'wa_chat_sessions',
  updatedAt: false,
});

export default ChatSession;
