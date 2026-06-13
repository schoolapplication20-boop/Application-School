import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Product = sequelize.define('Product', {
  productId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'product_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id',
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'product_name',
  },
  description: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    field: 'image_url',
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_available',
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    field: 'stock_quantity',
  },
  taxPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'tax_percentage',
  },
  preparationTimeMinutes: {
    type: DataTypes.INTEGER,
    field: 'preparation_time_minutes',
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING(255)),
  },
}, {
  tableName: 'wa_products',
  paranoid: true,
});

export default Product;
