import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: 'patient' | 'admin' | 'doctor';
}

export const signToken = (payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string') {
    throw new Error('Unexpected token payload');
  }
  return decoded as AuthTokenPayload;
};
