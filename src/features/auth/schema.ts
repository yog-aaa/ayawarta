import { z } from "zod";

/**
 * Bcrypt operates on a maximum effective key size of 72 bytes.
 * Inputs exceeding this boundary are truncated by bcrypt implementations,
 * making any bytes beyond 72 silently irrelevant. Rejecting inputs exceeding
 * 72 bytes prevents denial-of-service / memory pressure and silent equivalent passwords.
 */
export const BCRYPT_MAX_BYTES = 72;

export function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function isValidPasswordByteLength(password: string): boolean {
  const bytes = getUtf8ByteLength(password);
  return bytes > 0 && bytes <= BCRYPT_MAX_BYTES;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Format email tidak valid");

export const loginPasswordSchema = z
  .string()
  .min(1, "Password tidak boleh kosong")
  .refine(
    (val) => getUtf8ByteLength(val) <= BCRYPT_MAX_BYTES,
    "Password melebihi batas maksimum 72 byte"
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
