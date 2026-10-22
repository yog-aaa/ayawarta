import "server-only";
import { z } from "zod";

export const serverEnvSchema = z.object({
  // Server-only secrets
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // Public / client-safe configuration
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_APP_ID is required"),

  // Optional keys
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_DISABLE_LIGHTNINGCSS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates the environment variables against the serverEnvSchema.
 * If validation fails, throws an Error containing only the names of missing or invalid keys.
 * NEVER leaks or prints credential values in error messages.
 */
export function validateServerEnv(
  envInput: Record<string, string | undefined> = process.env
): ServerEnv {
  const result = serverEnvSchema.safeParse(envInput);

  if (!result.success) {
    const missingOrInvalidKeys = Array.from(
      new Set(result.error.issues.map((issue) => issue.path.join(".")))
    );

    throw new Error(
      `Environment validation failed. Missing or invalid keys: ${missingOrInvalidKeys.join(", ")}`
    );
  }

  return result.data;
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = validateServerEnv(process.env);
  }
  return cachedEnv;
}
