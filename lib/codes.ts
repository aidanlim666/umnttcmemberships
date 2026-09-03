import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

/** How long a emailed code stays usable. */
export const CODE_TTL_MINUTES = 15;

/** How many wrong guesses a code tolerates before it is burned. */
export const MAX_ATTEMPTS = 5;

/**
 * Six digits, generated with a CSPRNG rather than Math.random — these guard account
 * creation and password reset, so predictable codes would be a real weakness.
 */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Codes are stored hashed, never in plain text. */
export function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.trim(), hash);
}

export function codeExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + CODE_TTL_MINUTES * 60_000);
}

export const CODE_RE = /^\d{6}$/;
