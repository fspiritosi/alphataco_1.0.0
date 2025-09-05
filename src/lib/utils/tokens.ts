import crypto from 'crypto';

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateExpirationDate(minutes: number = 15): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now;
}
