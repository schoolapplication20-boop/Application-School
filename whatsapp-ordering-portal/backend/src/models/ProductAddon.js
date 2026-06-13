import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ProductAddon = sequelize.define('ProductAddon', {
  addonId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'addon_id',
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'product_id',
  },
  addonName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'addon_name',
  },
  addonPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'addon_price',
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_required',
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order',
  },
}, {
  tableName: 'wa_product_addons',
  updatedAt: false,
});

export default ProductAddon;
