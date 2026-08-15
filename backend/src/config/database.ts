import { Pool, PoolConfig } from 'pg';

// Prefer DATABASE_URL (Neon/Render/etc). Fall back to discrete DB_* vars for local Docker.
function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const needsSsl =
      process.env.DB_SSL === 'true' ||
      /neon\.tech|supabase\.co|render\.com|amazonaws\.com/i.test(connectionString) ||
      connectionString.includes('sslmode=require');
    return {
      connectionString,
      max: 10,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_activities',
    max: 10,
  };
}

export const pool = new Pool(buildPoolConfig());

export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export default pool;
