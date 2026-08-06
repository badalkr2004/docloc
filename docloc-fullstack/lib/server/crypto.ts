import { nanoid } from 'nanoid';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import crypto from 'node:crypto';

export function generateShareToken(): string {
  return nanoid(32);
}

export function generateOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const otp = crypto.randomInt(min, max + 1);
  return otp.toString();
}

export function hashOtp(otp: string): string {
  const hash = sha256(new TextEncoder().encode(otp));
  return bytesToHex(hash);
}

export function verifyOtp(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}
