import "server-only";
import { z } from "zod";
import { validateLocalDatabaseTarget } from "@/features/invitations/db-guard";
import { validateNeonDatabaseTargets } from "@/features/invitations/neon-guard";

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
  DATABASE_URL_POOLED: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_DISABLE_LIGHTNINGCSS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type DatabaseConnectionMode = "runtime" | "migration";
export type DeploymentEnvironment = "production" | "preview" | "development" | "local";

export interface DatabaseConnectionSelection {
  url: string;
  isPooled: boolean;
  sourceKey: "DATABASE_URL_POOLED" | "DATABASE_URL";
}

/**
 * Resolves deployment environment using explicit indicators (e.g. VERCEL_ENV or AYAWARTA_DEPLOYMENT_TARGET).
 * Does NOT rely solely on NODE_ENV.
 */
export function resolveDeploymentEnvironment(explicit?: string): DeploymentEnvironment {
  if (explicit === "production" || explicit === "preview" || explicit === "development" || explicit === "local") {
    return explicit;
  }
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "development") return "development";
  if (process.env.AYAWARTA_DEPLOYMENT_TARGET === "production") return "production";
  return "local";
}

/**
 * Selects the database connection URL based on explicit execution mode and deployment environment (NEO-04, NEO-12).
 * - In "local" or "development" mode: runtime STRICTLY uses direct local DATABASE_URL and rejects remote database URLs.
 *   The presence of DATABASE_URL_POOLED (e.g. from .env.production) NEVER switches the local runtime to pooled or remote.
 * - In "production" mode (Vercel Production):
 *   - "runtime" mode: DATABASE_URL_POOLED is mandatory. If missing or empty, throws Error. Falling back to direct connection is prohibited.
 *   - "migration" mode: uses direct DATABASE_URL.
 * - In "preview" mode (Vercel Preview): uses DATABASE_URL_POOLED if present, otherwise direct DATABASE_URL.
 */
export function selectDatabaseConnectionUrl(
  env: { DATABASE_URL: string; DATABASE_URL_POOLED?: string },
  mode: DatabaseConnectionMode = "runtime",
  targetEnv?: DeploymentEnvironment
): DatabaseConnectionSelection {
  const deploymentEnv = targetEnv ?? resolveDeploymentEnvironment();

  // Local / Development isolation (NEO-12, NEO-15)
  if (deploymentEnv === "local" || deploymentEnv === "development") {
    const rawUrl = env.DATABASE_URL?.trim();
    // Validate target through single consistent local database contract (NEO-15)
    validateLocalDatabaseTarget(rawUrl);
    return {
      url: rawUrl!,
      isPooled: false,
      sourceKey: "DATABASE_URL",
    };
  }

  if (mode === "migration") {
    return {
      url: env.DATABASE_URL,
      isPooled: false,
      sourceKey: "DATABASE_URL",
    };
  }

  // Vercel Production runtime MUST use pooled connection (NEO-04, NEO-12)
  if (deploymentEnv === "production") {
    const pooled = env.DATABASE_URL_POOLED?.trim();
    if (!pooled || pooled.length === 0) {
      throw new Error(
        "DATABASE_URL_POOLED is required for Vercel Production runtime. " +
        "Falling back to direct connection is prohibited in production to prevent connection exhaustion in serverless environments."
      );
    }
    // Runtime uses the same Neon URL contract as production CLI preflight.
    validateNeonDatabaseTargets({ directUrl: env.DATABASE_URL, pooledUrl: pooled });
    return {
      url: pooled,
      isPooled: true,
      sourceKey: "DATABASE_URL_POOLED",
    };
  }

  // Vercel Preview runtime
  if (deploymentEnv === "preview") {
    const pooled = env.DATABASE_URL_POOLED?.trim();
    if (pooled && pooled.length > 0) {
      return {
        url: pooled,
        isPooled: true,
        sourceKey: "DATABASE_URL_POOLED",
      };
    }
    return {
      url: env.DATABASE_URL,
      isPooled: false,
      sourceKey: "DATABASE_URL",
    };
  }

  return {
    url: env.DATABASE_URL,
    isPooled: false,
    sourceKey: "DATABASE_URL",
  };
}

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
