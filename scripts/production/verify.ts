import "server-only";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadProductionConfig, type ProductionConfig } from "@/features/invitations/production-env";
import {
  assertNeonDatabaseTargets,
  type ApprovedTargetInput,
} from "@/features/invitations/neon-guard";
import { EXPECTED_SEED_COUNTS } from "@/features/invitations/seed-constants";
import {
  CANONICAL_PRODUCTION_MEDIA,
  getCanonicalMediaAssetMap,
} from "@/features/media/canonical-catalog";

export type ProductionDatabaseState =
  | "uninitialized"      // 0 tables in public schema — brand new Neon database ready for migrations
  | "tables_exist_empty" // application tables exist in public schema, but 0 rows — ready for seed
  | "has_data"           // application tables exist and contain rows
  | "unexpected_tables"; // public schema contains unknown non-AyaWarta tables

export interface DatabaseStateInspectionResult {
  state: ProductionDatabaseState;
  isSchemaCreated: boolean;
  isEmptyForMigration: boolean;
  isEmptyForSeed: boolean;
  existingTables: string[];
  tableCounts?: Record<string, number>;
  message: string;
}

export interface DatabaseMetadataClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  user?: { count(): Promise<number> };
  mediaAsset?: { count(): Promise<number> };
  invitation?: { count(): Promise<number> };
  invitationSections?: { count(): Promise<number> };
  partner?: { count(): Promise<number> };
  event?: { count(): Promise<number> };
  galleryItem?: { count(): Promise<number> };
  loveStory?: { count(): Promise<number> };
  giftAccount?: { count(): Promise<number> };
  $disconnect?(): Promise<void>;
}

export interface ProductionVerifyResult {
  executed: boolean;
  message: string;
  actualCounts?: Record<string, number>;
  isEmpty?: boolean;
  databaseState?: ProductionDatabaseState;
}

export interface ProductionVerifyOptions {
  execute?: boolean;
  config?: ProductionConfig;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  checkEmptyOnly?: boolean;
  mockClient?: DatabaseMetadataClient;
}

export interface MediaAssetRecord {
  id?: string;
  publicId: string;
  secureUrl: string;
  folder: string;
  resourceType: string;
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  originalName: string | null;
}

export interface MediaAssetVerificationResult {
  matchedCount: number;
  message: string;
}

const KNOWN_APP_TABLES = [
  "user",
  "mediaasset",
  "invitation",
  "invitationsections",
  "partner",
  "event",
  "galleryitem",
  "lovestory",
  "giftaccount",
];
const KNOWN_SYSTEM_TABLES = ["_prisma_migrations"];

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

/**
 * Verifies all 31 canonical MediaAsset records against the database 1:1 across all metadata fields (NEO-11).
 * Detects count mismatches, duplicate IDs, foreign IDs, and any field mutation.
 */
export function verifyCanonicalMediaAssets(
  dbAssets: readonly MediaAssetRecord[]
): MediaAssetVerificationResult {
  const catalogMap = getCanonicalMediaAssetMap();
  const canonicalCount = CANONICAL_PRODUCTION_MEDIA.length; // 31

  // 1. Total count check
  if (dbAssets.length !== canonicalCount) {
    throw new Error(
      `MediaAsset count mismatch: expected exactly ${canonicalCount} assets in database, found ${dbAssets.length}.`
    );
  }

  // 2. Duplicate detection and ID validation
  const seenIds = new Set<string>();
  for (const dbAsset of dbAssets) {
    if (!dbAsset.publicId || typeof dbAsset.publicId !== "string") {
      throw new Error("MediaAsset record is missing valid publicId.");
    }
    if (seenIds.has(dbAsset.publicId)) {
      throw new Error(
        `Duplicate MediaAsset found in database with publicId '${dbAsset.publicId}'.`
      );
    }
    seenIds.add(dbAsset.publicId);

    if (!catalogMap.has(dbAsset.publicId)) {
      throw new Error(
        `Unexpected MediaAsset '${dbAsset.publicId}' found in database that does not exist in canonical catalog.`
      );
    }
  }

  // 3. Exact 1:1 metadata match across all canonical fields
  for (const canonical of CANONICAL_PRODUCTION_MEDIA) {
    const dbAsset = dbAssets.find((a) => a.publicId === canonical.publicId);
    if (!dbAsset) {
      throw new Error(
        `Required canonical MediaAsset '${canonical.publicId}' missing from database.`
      );
    }

    if (dbAsset.secureUrl !== canonical.secureUrl) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': secureUrl expected '${canonical.secureUrl}', got '${dbAsset.secureUrl}'.`
      );
    }
    if (dbAsset.folder !== canonical.folder) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': folder expected '${canonical.folder}', got '${dbAsset.folder}'.`
      );
    }
    if (dbAsset.resourceType !== canonical.resourceType) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': resourceType expected '${canonical.resourceType}', got '${dbAsset.resourceType}'.`
      );
    }
    if (dbAsset.format !== canonical.format) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': format expected '${canonical.format}', got '${dbAsset.format}'.`
      );
    }
    if (dbAsset.bytes !== canonical.bytes) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': bytes expected '${canonical.bytes}', got '${dbAsset.bytes}'.`
      );
    }
    if (dbAsset.width !== canonical.width) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': width expected '${canonical.width}', got '${dbAsset.width}'.`
      );
    }
    if (dbAsset.height !== canonical.height) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': height expected '${canonical.height}', got '${dbAsset.height}'.`
      );
    }
    if (dbAsset.originalName !== canonical.originalName) {
      throw new Error(
        `MediaAsset metadata mismatch for '${canonical.publicId}': originalName expected '${canonical.originalName}', got '${dbAsset.originalName}'.`
      );
    }
  }

  return {
    matchedCount: canonicalCount,
    message: `All ${canonicalCount} MediaAsset records match canonical production catalog 1:1 across all metadata fields.`,
  };
}

/**
 * Inspects Neon database metadata in the public schema without assuming table existence (NEO-01).
 */
export async function inspectProductionDatabaseState(
  client: DatabaseMetadataClient
): Promise<DatabaseStateInspectionResult> {
  const rows = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;

  const existingTables = rows.map((r) => r.tablename);

  // 1. Uninitialized: 0 tables in public schema
  if (existingTables.length === 0) {
    return {
      state: "uninitialized",
      isSchemaCreated: false,
      isEmptyForMigration: true,
      isEmptyForSeed: false,
      existingTables: [],
      message: "Database schema is uninitialized (0 tables in public schema). Ready for initial migration.",
    };
  }

  // 2. Check for unexpected / foreign tables
  const lowerNames = existingTables.map((t) => t.toLowerCase());
  const foreignTables = lowerNames.filter(
    (t) => !KNOWN_APP_TABLES.includes(t) && !KNOWN_SYSTEM_TABLES.includes(t)
  );

  if (foreignTables.length > 0) {
    return {
      state: "unexpected_tables",
      isSchemaCreated: false,
      isEmptyForMigration: false,
      isEmptyForSeed: false,
      existingTables,
      message: `Database contains unexpected non-AyaWarta tables: ${foreignTables.join(", ")}.`,
    };
  }

  // 3. Count rows in all 9 application tables
  const counts: Record<string, number> = {};
  if (
    client.user &&
    client.mediaAsset &&
    client.invitation &&
    client.invitationSections &&
    client.partner &&
    client.event &&
    client.galleryItem &&
    client.loveStory &&
    client.giftAccount
  ) {
    counts.user = await client.user.count();
    counts.mediaAsset = await client.mediaAsset.count();
    counts.invitation = await client.invitation.count();
    counts.invitationSections = await client.invitationSections.count();
    counts.partner = await client.partner.count();
    counts.event = await client.event.count();
    counts.galleryItem = await client.galleryItem.count();
    counts.loveStory = await client.loveStory.count();
    counts.giftAccount = await client.giftAccount.count();
  }

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  if (totalRows === 0) {
    return {
      state: "tables_exist_empty",
      isSchemaCreated: true,
      isEmptyForMigration: false,
      isEmptyForSeed: true,
      existingTables,
      tableCounts: counts,
      message: "Application tables exist and are empty (0 rows across application tables). Ready for seed.",
    };
  }

  return {
    state: "has_data",
    isSchemaCreated: true,
    isEmptyForMigration: false,
    isEmptyForSeed: false,
    existingTables,
    tableCounts: counts,
    message: `Database contains application data (${totalRows} total rows).`,
  };
}

export async function checkEmptyProductionDatabase(
  client: DatabaseMetadataClient
): Promise<{ isEmpty: boolean; counts?: Record<string, number>; state: ProductionDatabaseState }> {
  const inspection = await inspectProductionDatabaseState(client);
  return {
    isEmpty: inspection.isEmptyForMigration || inspection.isEmptyForSeed,
    counts: inspection.tableCounts,
    state: inspection.state,
  };
}

export async function runProductionVerification(
  options?: ProductionVerifyOptions
): Promise<ProductionVerifyResult> {
  const shouldExecute = options?.execute ?? process.argv.includes("--execute");

  if (!shouldExecute) {
    const msg =
      "[Prod Verify] Safety stop: production verification requires explicit '--execute' flag. No database connection was opened.";
    console.log(msg);
    return { executed: false, message: msg };
  }

  const isCheckEmptyOnly =
    options?.checkEmptyOnly ?? process.argv.includes("--check-empty");

  console.log("=== AyaWarta Production Database Verification Preflight ===");

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

  // 3. Dynamic import of Prisma modules after target validation passes
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { createInvitationRepository } = await import("@/features/invitations/repository");
  const { APPROVED_INVITATION_SLUGS } = await import("@/features/media/public-id");

  const adapter = new PrismaPg(config.DATABASE_URL);
  const prisma = options?.mockClient ?? new PrismaClient({ adapter });

  try {
    if (isCheckEmptyOnly) {
      console.log("[Prod Verify] Inspecting Neon production database state before migration...");
      const inspection = await inspectProductionDatabaseState(prisma);
      console.log(`[Prod Verify] Database state: ${inspection.state}`);
      console.log(`[Prod Verify] Details: ${inspection.message}`);
      if (inspection.existingTables.length > 0) {
        console.log(`[Prod Verify] Existing tables in 'public': ${inspection.existingTables.join(", ")}`);
      }
      if (inspection.tableCounts) {
        console.log("Current table counts:", JSON.stringify(inspection.tableCounts, null, 2));
      }

      if (inspection.state === "has_data" || inspection.state === "unexpected_tables") {
        throw new Error(
          `Neon production database is NOT ready for migration. State: ${inspection.state}. ${inspection.message}`
        );
      }

      console.log("[PASS] Neon production database preflight empty check completed successfully.");
      return {
        executed: true,
        message: inspection.message,
        actualCounts: inspection.tableCounts,
        isEmpty: true,
        databaseState: inspection.state,
      };
    }

    console.log("=== Verifying AyaWarta Seed in Neon Production Database ===");

    // 1. Table counts check
    const clientForCounts = prisma as unknown as {
      user: { count(): Promise<number> };
      mediaAsset: { count(): Promise<number> };
      invitation: { count(): Promise<number> };
      invitationSections: { count(): Promise<number> };
      partner: { count(): Promise<number> };
      event: { count(): Promise<number> };
      galleryItem: { count(): Promise<number> };
      loveStory: { count(): Promise<number> };
      giftAccount: { count(): Promise<number> };
    };

    const actualCounts: Record<string, number> = {
      user: await clientForCounts.user.count(),
      mediaAsset: await clientForCounts.mediaAsset.count(),
      invitation: await clientForCounts.invitation.count(),
      invitationSections: await clientForCounts.invitationSections.count(),
      partner: await clientForCounts.partner.count(),
      event: await clientForCounts.event.count(),
      galleryItem: await clientForCounts.galleryItem.count(),
      loveStory: await clientForCounts.loveStory.count(),
      giftAccount: await clientForCounts.giftAccount.count(),
    };

    console.log("Actual Table Counts:", JSON.stringify(actualCounts, null, 2));

    for (const [table, expected] of Object.entries(EXPECTED_SEED_COUNTS)) {
      const actual = actualCounts[table];
      if (actual !== expected) {
        throw new Error(
          `Row count mismatch for '${table}'. Expected: ${expected}, Actual: ${actual}.`
        );
      }
    }
    console.log("[PASS] All 9 table row counts match expected values exactly (total 86 rows).");

    // 2. galleryVideoUrl contract check
    const clientForQueries = prisma as unknown as {
      invitation: {
        findUnique(args: unknown): Promise<{ galleryVideoUrl: string | null } | null>;
        findMany(args: unknown): Promise<Array<{ slug: string; galleryVideoUrl: string | null }>>;
      };
      mediaAsset: {
        findMany(): Promise<MediaAssetRecord[]>;
      };
    };

    const previewInv = await clientForQueries.invitation.findUnique({
      where: { slug: "default-preview" },
      select: { galleryVideoUrl: true },
    });
    if (!previewInv?.galleryVideoUrl || !previewInv.galleryVideoUrl.includes("youtube.com")) {
      throw new Error("Default preview missing expected YouTube galleryVideoUrl.");
    }

    const nonPreviewInvs = await clientForQueries.invitation.findMany({
      where: { slug: { not: "default-preview" } },
      select: { slug: true, galleryVideoUrl: true },
    });
    for (const inv of nonPreviewInvs) {
      if (inv.galleryVideoUrl !== null) {
        throw new Error(`Invitation '${inv.slug}' expected null galleryVideoUrl, got '${inv.galleryVideoUrl}'.`);
      }
    }
    console.log("[PASS] galleryVideoUrl contract verified.");

    // 3. Domain reconstruction check for all 4 approved slugs
    const invitationRepository = createInvitationRepository(prisma as unknown as Parameters<typeof createInvitationRepository>[0]);
    for (const slug of APPROVED_INVITATION_SLUGS) {
      console.log(`Verifying repository reconstruction for '${slug}'...`);
      const reconstructed = await invitationRepository.findBySlug(slug);
      if (!reconstructed) {
        throw new Error(`Failed to reconstruct invitation '${slug}' from Neon database.`);
      }
      if (!reconstructed.data.couple.heroImage) {
        throw new Error(`Reconstructed invitation '${slug}' missing required couple.heroImage.`);
      }
      console.log(`[PASS] Reconstructed '${slug}' verified.`);
    }

    // 4. Unknown slug returns null
    const unknown = await invitationRepository.findBySlug("unknown-slug-test");
    if (unknown !== null) {
      throw new Error("Unknown slug did not return null.");
    }
    console.log("[PASS] Unknown slug returns null without preview fallback.");

    // 5. Full Canonical MediaAsset 1:1 match across all fields (NEO-11)
    const dbAssets = await clientForQueries.mediaAsset.findMany();
    const mediaVerification = verifyCanonicalMediaAssets(dbAssets);
    console.log(`[PASS] ${mediaVerification.message}`);

    console.log("=== All Production Seed Verifications Passed Successfully ===");
    return {
      executed: true,
      message: "All production seed verifications passed successfully.",
      actualCounts,
      isEmpty: false,
    };
  } catch {
    // NEO-06: Strict error sanitization. Never leak err.message or connection strings!
    throw new Error("[Prod Verify] Verification failed safely. Raw errors suppressed.");
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
  runProductionVerification()
    .then((result) => {
      if (!result.executed) {
        process.exitCode = 0;
      }
    })
    .catch(() => {
      // NEO-06: Strict error sanitization on direct CLI invocation
      console.error("=== AyaWarta Production Verification Failed ===");
      console.error(
        "[Prod Verify] Verification failed safely. Raw errors and connection strings suppressed to prevent credential leakage."
      );
      process.exit(1);
    });
}
