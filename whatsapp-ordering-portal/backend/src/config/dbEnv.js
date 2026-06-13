/**
 * Resolves PostgreSQL connection parameters from either a single
 * DATABASE_URL (as provided by Railway's Postgres plugin) or the
 * discrete DB_* variables used for local development.
 */
export const getDbConnectionConfig = () => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ''),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }

  const isTest = process.env.NODE_ENV === 'test';
  const dbName = isTest ? process.env.TEST_DB_NAME : (process.env.DB_NAME || 'postgres');

  // For Supabase/pooler, username might be postgres.project_id
  // Extract just the 'postgres' part if it contains a dot
  const [baseUsername] = (process.env.DB_USERNAME || 'postgres').split('.');

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: dbName,
    username: baseUsername,
    password: process.env.DB_PASSWORD || 'postgres',
  };
};

export default getDbConnectionConfig;
