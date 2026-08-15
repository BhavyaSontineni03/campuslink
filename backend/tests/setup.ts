import pool, { testConnection } from '../src/config/database';

// Global test setup
beforeAll(async () => {
  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Database connection failed');
  }
});

// Global test teardown
afterAll(async () => {
  // Close the MySQL connection pool so Jest can exit cleanly
  await pool.end();
});
