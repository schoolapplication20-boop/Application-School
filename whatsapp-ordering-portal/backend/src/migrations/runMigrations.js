import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Build Sequelize instance ──────────────────────────────────────────────────
// Always enable SSL when running on Railway (NODE_ENV=production) or when
// DB_SSL=require is set explicitly.  rejectUnauthorized=false is required
// because Railway's Postgres uses a self-signed cert on the internal proxy.
const sslRequired =
  process.env.DB_SSL === 'require' ||
  process.env.NODE_ENV === 'production';

const sslOptions = sslRequired
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

let sequelize;

if (process.env.DATABASE_URL) {
  // Parse the URL into individual params — avoids pg-connection-string
  // overriding our SSL settings when the URL is passed as a string.
  const u = new URL(process.env.DATABASE_URL);
  sequelize = new Sequelize({
    dialect:  'postgres',
    host:     u.hostname,
    port:     Number(u.port) || 5432,
    database: u.pathname.replace(/^\//, ''),
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    logging:  false,
    dialectOptions: sslOptions,
  });
} else {
  // Local development with discrete DB_* variables
  sequelize = new Sequelize(
    process.env.DB_NAME || 'whatsapp_portal',
    process.env.DB_USERNAME || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: sslOptions,
    },
  );
}

// ── Run migrations ────────────────────────────────────────────────────────────
async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    // Normalise DATABASE_URL — strip jdbc: prefix if present
    // (Railway also exposes JDBC_DATABASE_URL for Java apps; Node needs the plain URL)
    if (process.env.DATABASE_URL) {
      const raw = process.env.DATABASE_URL;
      if (raw.startsWith('jdbc:')) {
        process.env.DATABASE_URL = raw.replace(/^jdbc:/, '');
        console.log('ℹ️  Stripped jdbc: prefix from DATABASE_URL (was JDBC format, converted to standard)');
      }
      try {
        const u = new URL(process.env.DATABASE_URL);
        console.log(`🗄️  DB host : ${u.hostname}:${u.port || 5432}`);
        console.log(`🗄️  DB name : ${u.pathname.replace('/', '')}`);
        console.log(`🗄️  Protocol: ${u.protocol}`);
      } catch (e) {
        console.log('🗄️  DATABASE_URL is set but could not be parsed:', e.message);
      }
    } else {
      console.log('⚠️  DATABASE_URL is NOT set — will try localhost:5432 (will fail on Railway!)');
      console.log('   → Go to Railway wop-backend → Variables → select your wop-postgres database');
    }

    // Verify connection first — gives a clear error if DATABASE_URL is wrong
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create schema
    console.log('📦 Creating whatsapp_portal schema...');
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS whatsapp_portal;');
    console.log('✅ Schema ready');

    // Run init.sql
    const initSqlPath = path.join(__dirname, '../../docker/init.sql');
    console.log(`📋 Running init.sql from: ${initSqlPath}`);

    if (fs.existsSync(initSqlPath)) {
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      const statements = initSql.split(';').filter((s) => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sequelize.query(statement + ';');
          } catch (err) {
            if (!err.message.includes('already exists')) {
              console.warn('⚠️  Statement warning:', err.message.slice(0, 120));
            }
          }
        }
      }
      console.log('✅ All tables created');
    } else {
      console.warn('⚠️  init.sql not found at:', initSqlPath);
      console.warn('   Tables will be created by Sequelize sync on first start.');
    }

    console.log('✅ Migrations complete!');
    process.exit(0);
  } catch (error) {
    // Log the full error so Railway shows the actual reason
    console.error('❌ Migration failed!');
    console.error('   Message  :', error.message || '(no message)');
    console.error('   Code     :', error.code || error.original?.code || '—');
    console.error('   Detail   :', error.original?.detail || error.detail || '—');
    console.error('   Hint     :', error.original?.hint || '—');
    if (process.env.NODE_ENV !== 'production') {
      console.error('   Stack    :', error.stack);
    }
    process.exit(1);
  }
}

runMigrations();
