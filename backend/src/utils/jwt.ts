import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: number;
  role: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }
  return secret;
}

export function signToken(payload: TokenPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}
