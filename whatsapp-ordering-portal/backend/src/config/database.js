import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const dbName = isTest ? process.env.TEST_DB_NAME : process.env.DB_NAME || 'postgres';

// For Supabase/pooler, username might be postgres.project_id
// Extract just the 'postgres' part if it contains a dot
const username = process.env.DB_USERNAME || 'postgres';
const [baseUsername] = username.split('.'); // Takes everything before the dot

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: dbName,
  username: baseUsername,
  password: process.env.DB_PASSWORD || 'postgres',
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
