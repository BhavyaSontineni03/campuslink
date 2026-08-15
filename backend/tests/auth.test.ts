import request from 'supertest';
import app from '../src/app';
import pool from '../src/config/database';
import { verifyToken } from '../src/utils/jwt';

describe('Auth: JWT issuance and verification', () => {
  const testEmail = `jwt-test-${Date.now()}@university.edu`;

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  });

  it('register returns a valid token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail,
      name: 'JWT Test User',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.token).toBe('string');
    const payload = verifyToken(res.body.data.token);
    expect(payload.role).toBe('student');
  });

  it('login returns a valid token for correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe('string');
  });

  it('rejects a protected route with no Authorization header', async () => {
    const res = await request(app).get('/api/users/1/notifications');
    expect(res.status).toBe(401);
  });

  it('rejects a protected route with a garbage token', async () => {
    const res = await request(app)
      .get('/api/users/1/notifications')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts a protected route with a valid token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: testEmail,
      password: 'password123',
    });
    const token = login.body.data.token;
    const userId = login.body.data.user.id;

    const res = await request(app)
      .get(`/api/users/${userId}/notifications`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
