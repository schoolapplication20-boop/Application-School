import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { getDbConnectionConfig } from './dbEnv.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest        = process.env.NODE_ENV === 'test';

// Enable SSL in production or when explicitly requested (Railway needs this)
const sslRequired =
  process.env.DB_SSL === 'require' ||
  process.env.NODE_ENV === 'production';

const dialectOptions = sslRequired
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const sharedOptions = {
  dialect:        'postgres',
  logging:        isDevelopment ? console.log : false,
  dialectOptions,
  pool:    { max: 5, min: 0, acquire: 30000, idle: 10000 },
  define:  { timestamps: true, underscored: true, freezeTableName: true },
};

// Normalise DATABASE_URL — strip jdbc: prefix if present.
// Railway exposes JDBC_DATABASE_URL for Java and DATABASE_URL for standard use,
// but if someone copies the wrong one we handle it gracefully.
if (process.env.DATABASE_URL?.startsWith('jdbc:')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^jdbc:/, '');
}

// Use DATABASE_URL when available, but parse it into individual params.
// Passing the raw URL string to Sequelize lets pg-connection-string parse
// its own SSL settings from the URL, which overrides dialectOptions and
// causes SELF_SIGNED_CERT_IN_CHAIN errors on Supabase / Railway.
const sequelize = process.env.DATABASE_URL
  ? (() => {
      const u = new URL(process.env.DATABASE_URL);
      return new Sequelize({
        ...sharedOptions,
        host:     u.hostname,
        port:     Number(u.port) || 5432,
        database: u.pathname.replace(/^\//, ''),
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
      });
    })()
  : (() => {
      const cfg = getDbConnectionConfig();
      return new Sequelize({
        ...sharedOptions,
        host:     cfg.host,
        port:     cfg.port,
        database: cfg.database,
        username: cfg.username,
        password: cfg.password,
        schema:   process.env.DB_SCHEMA || 'whatsapp_portal',
      });
    })();

/** Test connectivity and optionally sync models in dev */
export const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    if (isDevelopment && !isTest) {
      await sequelize.sync({ alter: false });
      console.log('✓ Database models synchronised');
    }

    return sequelize;
  } catch (error) {
    console.warn('⚠ Database connection warning:', error.message);
    return sequelize;
  }
};

export const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✓ Database connection closed');
  } catch (error) {
    console.error('✗ Failed to close database connection:', error.message);
  }
};

export default sequelize;
