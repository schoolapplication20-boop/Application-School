import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { MESSAGE_TEMPLATE_TYPES } from '../utils/constants.js';

const MessageTemplate = sequelize.define('MessageTemplate', {
  templateId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'template_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  templateName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'template_name',
  },
  templateType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'template_type',
    validate: { isIn: [Object.values(MESSAGE_TEMPLATE_TYPES)] },
  },
  templateBody: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'template_body',
  },
  variables: DataTypes.JSONB,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'wa_message_templates',
});

export default MessageTemplate;
