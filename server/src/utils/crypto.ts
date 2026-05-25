import { nanoid } from 'nanoid';

export function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

export function generateToken(): string {
  return nanoid(32);
}
