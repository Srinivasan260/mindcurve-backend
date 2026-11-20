import { createHash, randomBytes } from 'crypto';

export interface GeneratedToken {
  raw: string;
  hash: string;
}

export const generateToken = (byteLength = 32): GeneratedToken => {
  const raw = randomBytes(byteLength).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');
