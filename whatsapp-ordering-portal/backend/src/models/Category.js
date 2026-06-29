import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Category = sequelize.define('Category', {
  categoryId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'category_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  categoryName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'category_name',
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order',
  },
  iconUrl: {
    type: DataTypes.STRING(500),
    field: 'icon_url',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'wa_categories',
  paranoid: true,
});

export default Category;
