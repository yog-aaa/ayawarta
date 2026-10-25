import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { defineConfig, env } from "prisma/config";
import {
  validateNeonDatabaseTargets,
  type SanitizedNeonTarget,
} from "./src/features/invitations/neon-guard";
import { validateLocalDatabaseTarget } from "./src/features/invitations/db-guard";

export interface PrismaGuardResult {
  isProduction: boolean;
  sanitizedTarget?: SanitizedNeonTarget;
  effectiveDirectUrl?: string;
}

export interface AssertPrismaTargetGuardOptions {
  envPath?: string;
  explicitEnv?: Record<string, string | undefined>;
  explicitFileEnv?: Record<string, string | undefined>;
  cwd?: string;
}

/**
 * Asserts that Prisma CLI execution targets a valid, authorized database environment (NEO-09, NEO-13, NEO-14, NEO-15, NEO-16).
 *
 * Protection Guarantees:
 * - Default execution is strictly LOCAL-ONLY: rejects all remote targets (Neon, Aiven, Supabase, AWS, etc.)
 *   and URL connection target redirection parameters (?host=..., ?hostaddr=..., etc.) via validateLocalDatabaseTarget (NEO-15).
 * - Rejects forged old boolean markers (e.g. AYAWARTA_PRODUCTION_PREFLIGHT_PASSED=1).
 * - The shell marker AYAWARTA_EXECUTION_CONTEXT=production_migration_wrapper is NOT trusted alone.
 *   When present, it resolves effective configuration ONCE, fails closed if shell and file conflict,
 *   performs FULL on-load validation of direct URL, pooled URL, TLS enforcement, and the complete approved target tuple,
 *   and supplies the EXACT validated direct URL to Prisma datasource (NEO-16).
 *
 * Honest Protection Boundary:
 * This guard prevents accidental execution of project scripts (e.g. 'npx prisma migrate dev' or 'prisma db push')
 * against remote or unauthorized databases. It is an internal safeguard for repository workflows, not an absolute
 * security sandbox against an operator with full local shell access who could execute arbitrary custom scripts.
 */
export function assertPrismaTargetGuard(
  envInput: Record<string, string | undefined> = process.env,
  options?: AssertPrismaTargetGuardOptions
): PrismaGuardResult {
  const isWrapperContext =
    (options?.explicitEnv?.AYAWARTA_EXECUTION_CONTEXT ??
      envInput.AYAWARTA_EXECUTION_CONTEXT) === "production_migration_wrapper";

  if (isWrapperContext) {
    // 1. Production wrapper execution pathway (NEO-13, NEO-14, NEO-16)
    // Determine effective configuration once without validate-then-override sequence
    const shellEnv = options?.explicitEnv ?? envInput;
    const shellDirect = shellEnv.DATABASE_URL?.trim() || undefined;
    const shellPooled = shellEnv.DATABASE_URL_POOLED?.trim() || undefined;
    const shellFingerprint = shellEnv.APPROVED_NEON_TARGET_FINGERPRINT?.trim() || undefined;

    // Load file configuration
    let fileEnv: Record<string, string>;
    if (options?.explicitFileEnv) {
      fileEnv = options.explicitFileEnv as Record<string, string>;
    } else if (options?.explicitEnv && !options?.envPath) {
      // In hermetic tests with explicitEnv and no envPath, treat explicitEnv as the approved file configuration
      fileEnv = options.explicitEnv as Record<string, string>;
    } else {
      const prodPath =
        options?.envPath ?? path.resolve(options?.cwd ?? process.cwd(), ".env.production");
      if (!fs.existsSync(prodPath)) {
        throw new Error(
          "Production Prisma configuration requires valid .env.production file. File not found."
        );
      }
      try {
        fileEnv = dotenv.parse(fs.readFileSync(prodPath, "utf-8"));
      } catch {
        throw new Error("Failed to parse .env.production file.");
      }
    }

    const fileDirect = fileEnv.DATABASE_URL?.trim() || undefined;
    const filePooled = fileEnv.DATABASE_URL_POOLED?.trim() || undefined;
    const fileFingerprint =
      fileEnv.APPROVED_NEON_TARGET_FINGERPRINT?.trim() ||
      (fileEnv.APPROVED_NEON_ENDPOINT && fileEnv.APPROVED_NEON_DATABASE && fileEnv.APPROVED_NEON_ROLE
        ? `${fileEnv.APPROVED_NEON_ENDPOINT.trim()}:${fileEnv.APPROVED_NEON_DATABASE.trim()}:${fileEnv.APPROVED_NEON_ROLE.trim()}`
        : undefined);

    // Fail if shell URL and production file URL conflict (NEO-16)
    if (shellDirect && fileDirect && shellDirect !== fileDirect) {
      throw new Error(
        "Conflicting DATABASE_URL detected: shell environment and .env.production specify different database connection URLs."
      );
    }
    if (shellPooled && filePooled && shellPooled !== filePooled) {
      throw new Error(
        "Conflicting DATABASE_URL_POOLED detected: shell environment and .env.production specify different database connection URLs."
      );
    }
    if (shellFingerprint && fileFingerprint && shellFingerprint !== fileFingerprint) {
      throw new Error(
        "Conflicting APPROVED_NEON_TARGET_FINGERPRINT detected: shell environment and .env.production specify different target fingerprints."
      );
    }

    // Effective single configuration
    const effectiveDirect = shellDirect ?? fileDirect;
    const effectivePooled = shellPooled ?? filePooled;
    const effectiveFingerprint = shellFingerprint ?? fileFingerprint;

    if (!effectiveDirect || !effectivePooled) {
      throw new Error(
        "Production Prisma execution requires both DATABASE_URL (direct) and DATABASE_URL_POOLED (pooled) configured."
      );
    }

    // Full fail-closed validation of direct URL, pooled URL, TLS, and approved target tuple (endpoint + database + role)
    const sanitizedTarget = validateNeonDatabaseTargets({
      directUrl: effectiveDirect,
      pooledUrl: effectivePooled,
      approvedTarget: effectiveFingerprint,
      requireApprovedTarget: true,
    });

    return {
      isProduction: true,
      sanitizedTarget,
      effectiveDirectUrl: effectiveDirect,
    };
  }

  // 2. Reject old forged preflight markers in default configuration (NEO-09)
  const localEnv = options?.explicitEnv ?? envInput;
  if (
    localEnv.AYAWARTA_TARGET_ENV === "production" ||
    localEnv.AYAWARTA_PRODUCTION_PREFLIGHT_PASSED === "1"
  ) {
    throw new Error(
      "Direct Prisma CLI execution with production environment markers is prohibited via default prisma.config.ts. " +
      "Default configuration is local-only. Use 'pnpm prod:migrate --execute' which loads verified production configuration."
    );
  }

  // 3. Default execution pathway: STRICTLY LOCAL-ONLY (NEO-09, NEO-13, NEO-15)
  // Enforces single local database target validation contract (NEO-15)
  const targetUrl = localEnv.DATABASE_URL?.trim();
  if (targetUrl) {
    try {
      validateLocalDatabaseTarget(targetUrl);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("Disallowed database host")) {
        throw new Error(
          "Direct Prisma CLI execution against remote database targets is prohibited via default prisma.config.ts. " +
          "Default configuration is local-only. Use 'pnpm prod:migrate --execute' which loads verified production configuration. " +
          msg
        );
      }
      throw err;
    }
    return {
      isProduction: false,
    };
  }

  return { isProduction: false };
}

/**
 * Constructs Prisma configuration passing the exact validated direct URL to datasource (NEO-16).
 */
export function buildPrismaConfig(guardResult: PrismaGuardResult) {
  return defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
      path: "prisma/migrations",
      seed: "tsx --conditions=react-server prisma/seed.ts",
    },
    datasource: {
      url: guardResult.effectiveDirectUrl ?? env("DATABASE_URL"),
    },
  });
}

// In local mode, load environment files once BEFORE running the guard
const isWrapperContext =
  process.env.AYAWARTA_EXECUTION_CONTEXT === "production_migration_wrapper";

if (!isWrapperContext) {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

// Evaluate guard once on effective configuration (no validate-then-override sequence) (NEO-16)
const targetContext = assertPrismaTargetGuard();

export default buildPrismaConfig(targetContext);
