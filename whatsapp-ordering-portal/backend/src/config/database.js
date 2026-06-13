import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { getDbConnectionConfig } from './dbEnv.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const dbConfig = getDbConnectionConfig();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.username,
  password: dbConfig.password,
  schema: process.env.DB_SCHEMA || 'whatsapp_portal',
  logging: isDevelopment ? console.log : false,
  dialectOptions: process.env.DB_SSL === 'require' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

/**
 * Initialize database connection
 */
export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync models if in development
    if (isDevelopment && !isTest) {
      await sequelize.sync({ alter: false });
      console.log('✓ Database synchronized');
    }

    return sequelize;
  } catch (error) {
    console.warn('⚠ Database connection warning:', error.message);
    // Don't throw - let the app continue for now
    // This allows the health endpoint to work even without DB
    return sequelize;
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Failed to close database connection:', error.message);
  }
};

export default sequelize;
