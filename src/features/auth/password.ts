import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/**
 * Pre-computed valid bcrypt hash for dummy password verification.
 * Used when an email is unknown or account is locked, ensuring equal
 * cryptographic computation time and preventing email enumeration via timing attacks.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$10$ET0qzXCRdNFaB5aeVmvrCubNBJH9JJh6kRWtot2Vyf30zPYLeCVAG";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
