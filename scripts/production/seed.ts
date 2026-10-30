import "server-only";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadProductionConfig, type ProductionConfig } from "@/features/invitations/production-env";
import {
  assertNeonDatabaseTargets,
  type ApprovedTargetInput,
} from "@/features/invitations/neon-guard";
import type { PrismaClient } from "@/generated/prisma/client";

export interface ProductionSeedResult {
  executed: boolean;
  message: string;
  seedResult?: unknown;
}

export interface ProductionSeedOptions {
  execute?: boolean;
  config?: ProductionConfig;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  customPrismaClient?: PrismaClient;
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
  return undefined;
}

export async function runProductionSeed(
  options?: ProductionSeedOptions
): Promise<ProductionSeedResult> {
  const shouldExecute = options?.execute ?? process.argv.includes("--execute");

  if (!shouldExecute) {
    const msg =
      "[Prod Seed] Safety stop: production seed requires explicit '--execute' flag. No database connection was opened.";
    console.log(msg);
    return { executed: false, message: msg };
  }

  console.log("=== AyaWarta Production Seed Starting ===");

  // 1. Explicit production config
  const config = options?.config ?? loadProductionConfig();

  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    throw new Error(
      "[Prod Seed] Execution failed: ADMIN_EMAIL and ADMIN_PASSWORD are required in .env.production for production seed."
    );
  }

  // 2. Resolve approved target and enforce strict target approval (NEO-08, NEO-14)
  const approvedTarget = resolveApprovedTarget(options, config);

  assertNeonDatabaseTargets({
    directUrl: config.DATABASE_URL,
    pooledUrl: config.DATABASE_URL_POOLED,
    approvedTarget,
    requireApprovedTarget: true,
  });

  // 3. Dynamic import of Prisma dependencies only AFTER target assertion passes
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { executeSeed } = await import("@/features/invitations/seed");
  const { CANONICAL_PRODUCTION_MEDIA } = await import("@/features/media/canonical-catalog");

  const adapter = new PrismaPg(config.DATABASE_URL);
  const prisma = options?.customPrismaClient ?? new PrismaClient({ adapter });

  try {
    console.log("[Prod Seed] Connected to verified Neon target. Executing canonical seed...");
    // NEO-02: Flow validated production admin credentials explicitly without mutating process.env
    const result = await executeSeed(
      {
        canonicalMedia: CANONICAL_PRODUCTION_MEDIA,
        bootstrapAdmin: true,
        requireAdminBootstrap: true,
        adminCredentials: {
          email: config.ADMIN_EMAIL,
          password: config.ADMIN_PASSWORD,
        },
      },
      prisma
    );

    console.log("=== AyaWarta Production Seed Completed Successfully ===");
    console.log(JSON.stringify(result, null, 2));
    return { executed: true, message: "Production seed completed successfully.", seedResult: result };
  } catch {
    // NEO-06: Strict error sanitization. Never leak err.message or connection strings!
    throw new Error("[Prod Seed] Execution failed safely. Raw errors suppressed.");
  } finally {
    if (typeof prisma.$disconnect === "function") {
      await prisma.$disconnect();
    }
  }
}

// Direct CLI invocation guard
const isDirectExecution =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runProductionSeed()
    .then((result) => {
      if (!result.executed) {
        process.exitCode = 0;
      }
    })
    .catch(() => {
      // NEO-06: Strict error sanitization on direct CLI invocation
      console.error("=== AyaWarta Production Seed Failed ===");
      console.error(
        "[Prod Seed] Execution failed safely. Raw errors and connection strings suppressed to prevent credential leakage."
      );
      process.exit(1);
    });
}
