import "server-only";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadProductionConfig, type ProductionConfig } from "@/features/invitations/production-env";
import {
  assertNeonDatabaseTargets,
  type ApprovedTargetInput,
} from "@/features/invitations/neon-guard";

export interface ProductionMigrationResult {
  executed: boolean;
  message: string;
}

export interface MigrationRunnerResult {
  status: number | null;
  stdout?: string;
  stderr?: string;
}

export interface ProductionMigrationOptions {
  execute?: boolean;
  config?: ProductionConfig;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  runner?: (command: string, env: NodeJS.ProcessEnv) => MigrationRunnerResult;
}

function resolveApprovedTarget(
  options?: { approvedTarget?: ApprovedTargetInput; approvedTargetId?: string },
  config?: ProductionConfig
): ApprovedTargetInput | undefined {
  if (options?.approvedTarget) return options.approvedTarget;
  if (options?.approvedTargetId?.trim()) return options.approvedTargetId.trim();
  const cliArg = process.argv.find((arg) => arg.startsWith("--approved-target="));
  if (cliArg) return cliArg.split("=")[1]?.trim();
  if (config?.APPROVED_NEON_TARGET_FINGERPRINT?.trim()) return config.APPROVED_NEON_TARGET_FINGERPRINT.trim();
  if (process.env.APPROVED_NEON_TARGET_FINGERPRINT?.trim()) return process.env.APPROVED_NEON_TARGET_FINGERPRINT.trim();
  return undefined;
}

export async function runProductionMigration(
  options?: ProductionMigrationOptions
): Promise<ProductionMigrationResult> {
  const shouldExecute = options?.execute ?? process.argv.includes("--execute");

  if (!shouldExecute) {
    const msg =
      "[Prod Migration] Safety stop: production migration requires explicit '--execute' flag. No database connection was opened.";
    console.log(msg);
    return { executed: false, message: msg };
  }

  console.log("=== AyaWarta Production Migration Preflight ===");

  // 1. Load production configuration
  const config = options?.config ?? loadProductionConfig();

  // 2. Resolve approved target and enforce strict target approval (NEO-08, NEO-14)
  const approvedTarget = resolveApprovedTarget(options, config);

  assertNeonDatabaseTargets({
    directUrl: config.DATABASE_URL,
    pooledUrl: config.DATABASE_URL_POOLED,
    approvedTarget,
    requireApprovedTarget: true,
  });

  console.log("[Prod Migration] Neon direct target verified and approved. Applying migrations...");

  // 3. Prepare child process environment with production wrapper context (NEO-09, NEO-13, NEO-14)
  const migrationEnv: NodeJS.ProcessEnv = {
    ...process.env,
    AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
    DATABASE_URL: config.DATABASE_URL,
    DATABASE_URL_POOLED: config.DATABASE_URL_POOLED,
  };
  if (approvedTarget) {
    const fingerprintStr =
      typeof approvedTarget === "string"
        ? approvedTarget
        : `${approvedTarget.endpoint}:${approvedTarget.database}:${approvedTarget.role}`;
    migrationEnv.APPROVED_NEON_TARGET_FINGERPRINT = fingerprintStr;
  }

  try {
    let runResult: MigrationRunnerResult;

    if (options?.runner) {
      runResult = options.runner("pnpm exec prisma migrate deploy", migrationEnv);
    } else {
      // NEO-10: Capture child process output with stdio: "pipe" to prevent raw output leakage
      const proc = spawnSync("pnpm.cmd", ["exec", "prisma", "migrate", "deploy"], {
        env: migrationEnv,
        encoding: "utf-8",
        stdio: "pipe",
        shell: true,
      });
      runResult = {
        status: proc.status,
        stdout: proc.stdout ?? "",
        stderr: proc.stderr ?? "",
      };
    }

    if (runResult.status !== 0) {
      // NEO-10: Suppress all child process stdout/stderr from console. Never leak connection strings or passwords!
      console.error(
        "[Prod Migration] Migration execution failed with non-zero exit code. Raw output suppressed to prevent credential leakage."
      );
      throw new Error("[Prod Migration] Execution failed safely. Raw errors suppressed.");
    }

    console.log("[Prod Migration] Production migrations applied successfully.");
    console.log("=== AyaWarta Production Migration Completed Successfully ===");
    return { executed: true, message: "Production migrations applied successfully." };
  } catch {
    // NEO-06, NEO-10: Strict error sanitization.
    throw new Error("[Prod Migration] Execution failed safely. Raw errors suppressed.");
  }
}

// Direct CLI invocation guard
const isDirectExecution =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runProductionMigration()
    .then((result) => {
      if (!result.executed) {
        process.exitCode = 0;
      }
    })
    .catch(() => {
      // NEO-06, NEO-10: Strict error sanitization on direct CLI invocation
      console.error("=== AyaWarta Production Migration Failed ===");
      console.error(
        "[Prod Migration] Execution failed safely. Raw errors and connection strings suppressed to prevent credential leakage."
      );
      process.exit(1);
    });
}
