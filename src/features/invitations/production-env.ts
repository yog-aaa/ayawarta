import "server-only";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import {
  validateNeonDatabaseTargets,
  type SanitizedNeonTarget,
  type ApprovedTargetInput,
} from "./neon-guard";

export class ProductionEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionEnvError";
  }
}

export interface ProductionConfig {
  DATABASE_URL: string;
  DATABASE_URL_POOLED: string;
  APPROVED_NEON_TARGET_FINGERPRINT?: string;
  APPROVED_NEON_PROJECT_ID?: string; // deprecated alias
  AUTH_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?: string;
  sanitizedTarget: SanitizedNeonTarget;
  rawEnv: Record<string, string>;
}

export interface LoadProductionConfigOptions {
  envPath?: string;
  explicitEnv?: Record<string, string | undefined>;
  allowProcessEnvFallback?: boolean;
  ignoreProcessEnvConflicts?: boolean;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  requireApprovedTarget?: boolean;
}

/**
 * Loads and validates production configuration explicitly from .env.production.
 *
 * Guarantees:
 * - NEVER loads .env.local or local developer settings.
 * - Detects and fails closed if shell/process environment variables conflict with .env.production.
 * - Verifies direct and pooled Neon database targets before any connection can be opened.
 * - Does not leak secret values in error messages.
 */
export function loadProductionConfig(
  options?: LoadProductionConfigOptions
): ProductionConfig {
  let envMap: Record<string, string> = {};

  if (options?.explicitEnv) {
    for (const [key, val] of Object.entries(options.explicitEnv)) {
      if (val !== undefined) {
        envMap[key] = val;
      }
    }
  } else {
    const targetFile = options?.envPath ?? path.resolve(process.cwd(), ".env.production");

    if (fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, "utf-8");
      const parsed = dotenv.parse(content);
      envMap = { ...parsed };
    } else if (options?.allowProcessEnvFallback) {
      for (const [key, val] of Object.entries(process.env)) {
        if (val !== undefined) {
          envMap[key] = val;
        }
      }
    } else {
      throw new ProductionEnvError(
        "Production environment file '.env.production' not found. Production commands must explicitly target .env.production."
      );
    }
  }

  // Guard against conflicting shell / process environment variables (unless explicitly bypassed for testing)
  if (!options?.ignoreProcessEnvConflicts) {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
      if (envMap.DATABASE_URL && process.env.DATABASE_URL.trim() !== envMap.DATABASE_URL.trim()) {
        throw new ProductionEnvError(
          "Conflicting environment: process.env.DATABASE_URL does not match production configuration. Clear shell variables before running production commands."
        );
      }
    }

    if (process.env.DATABASE_URL_POOLED && process.env.DATABASE_URL_POOLED.trim().length > 0) {
      if (envMap.DATABASE_URL_POOLED && process.env.DATABASE_URL_POOLED.trim() !== envMap.DATABASE_URL_POOLED.trim()) {
        throw new ProductionEnvError(
          "Conflicting environment: process.env.DATABASE_URL_POOLED does not match production configuration. Clear shell variables before running production commands."
        );
      }
    }
  }

  const directUrl = envMap.DATABASE_URL;
  const pooledUrl = envMap.DATABASE_URL_POOLED;

  const approvedTarget: ApprovedTargetInput | undefined =
    options?.approvedTarget ??
    options?.approvedTargetId ??
    envMap.APPROVED_NEON_TARGET_FINGERPRINT?.trim() ??
    (envMap.APPROVED_NEON_ENDPOINT && envMap.APPROVED_NEON_DATABASE && envMap.APPROVED_NEON_ROLE
      ? {
          endpoint: envMap.APPROVED_NEON_ENDPOINT.trim(),
          database: envMap.APPROVED_NEON_DATABASE.trim(),
          role: envMap.APPROVED_NEON_ROLE.trim(),
        }
      : undefined) ??
    envMap.APPROVED_NEON_PROJECT_ID?.trim();

  const sanitizedTarget = validateNeonDatabaseTargets({
    directUrl,
    pooledUrl,
    approvedTarget,
    requireApprovedTarget: options?.requireApprovedTarget,
  });

  const fingerprintStr =
    envMap.APPROVED_NEON_TARGET_FINGERPRINT ??
    (typeof approvedTarget === "string"
      ? approvedTarget
      : approvedTarget
        ? `${approvedTarget.endpoint}:${approvedTarget.database}:${approvedTarget.role}`
        : undefined);

  return {
    DATABASE_URL: directUrl,
    DATABASE_URL_POOLED: pooledUrl,
    APPROVED_NEON_TARGET_FINGERPRINT: fingerprintStr,
    APPROVED_NEON_PROJECT_ID: fingerprintStr,
    AUTH_SECRET: envMap.AUTH_SECRET,
    ADMIN_EMAIL: envMap.ADMIN_EMAIL,
    ADMIN_PASSWORD: envMap.ADMIN_PASSWORD,
    CLOUDINARY_API_KEY: envMap.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: envMap.CLOUDINARY_API_SECRET,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: envMap.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    sanitizedTarget,
    rawEnv: envMap,
  };
}
