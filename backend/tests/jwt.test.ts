import { signToken, verifyToken } from '../src/utils/jwt';

describe('jwt utility', () => {
  it('signs a payload and verifies it back to the same values', () => {
    const token = signToken({ userId: 42, role: 'student' });
    const payload = verifyToken(token);
    expect(payload.userId).toBe(42);
    expect(payload.role).toBe('student');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ userId: 42, role: 'student' });
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws on an expired token', () => {
    const token = signToken({ userId: 42, role: 'student' }, '-1s');
    expect(() => verifyToken(token)).toThrow();
  });
});
