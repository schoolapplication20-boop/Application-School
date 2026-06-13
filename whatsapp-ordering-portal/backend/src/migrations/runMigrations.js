import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
  },
);

// ======================================
// Run all migrations
// ======================================
async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    // 1. Create schema if it doesn't exist
    console.log('📦 Creating whatsapp_portal schema...');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS whatsapp_portal;');
    console.log('✅ Schema ready');

    // 2. Run init.sql to create all tables
    const initSqlPath = path.join(__dirname, '../../docker/init.sql');
    console.log(`📋 Running initialization script from: ${initSqlPath}`);

    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, 'utf8');

      // Split by ; and execute each statement
      const statements = initSql.split(';').filter((stmt) => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sequelize.query(statement);
          } catch (err) {
            // Ignore "already exists" errors
            if (!err.message.includes('already exists')) {
              console.warn('⚠️  Statement warning:', err.message.substring(0, 100));
            }
          }
        }
      }
      console.log('✅ All tables created');
    } else {
      console.warn('⚠️  init.sql not found at:', initSqlPath);
    }

    console.log('✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
