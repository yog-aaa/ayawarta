import "server-only";

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@/generated/prisma/client";
import { loadProductionConfig, type ProductionConfig } from "@/features/invitations/production-env";
import { assertNeonDatabaseTargets, type ApprovedTargetInput } from "@/features/invitations/neon-guard";
import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";
import { invitationDetailInclude } from "@/features/invitations/query";
import { mapPrismaToInvitation } from "@/features/invitations/mapper";
import {
  buildPublicationSnapshot,
  digestPublicationSnapshot,
  publicationMediaIds,
  verifyPublicationSnapshot,
} from "@/features/admin/publication-snapshot";

export interface BaselineInspection {
  total: number;
  matching: number;
  missing: number;
  pending: ReadonlyArray<{ invitationId: string; contentDigest: string }>;
}

export interface ProductionBaselineResult {
  executed: boolean;
  readOnly: boolean;
  matching: number;
  missing: number;
  message: string;
}

export interface ProductionBaselineOptions {
  execute?: boolean;
  check?: boolean;
  config?: ProductionConfig;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  customPrismaClient?: PrismaClient;
  /** Test seam; production always uses the repository's transaction-protected writer. */
  recordBaseline?: (client: PrismaClient, invitationId: string) => Promise<{ contentDigest: string }>;
}

function resolveApprovedTarget(options: ProductionBaselineOptions, config: ProductionConfig): ApprovedTargetInput | undefined {
  if (options.approvedTarget) return options.approvedTarget;
  if (options.approvedTargetId?.trim()) return options.approvedTargetId.trim();
  const cliArg = process.argv.find((arg) => arg.startsWith("--approved-target="));
  if (cliArg) return cliArg.split("=")[1]?.trim();
  return config.APPROVED_NEON_TARGET_FINGERPRINT?.trim();
}

/** Read-only validation of the four historical version-1 aggregates and any sealed baselines. */
export async function inspectProductionBaselines(client: PrismaClient): Promise<BaselineInspection> {
  const invitations = await client.invitation.findMany({
    where: { slug: { in: [...APPROVED_INVITATION_SLUGS] } },
    include: invitationDetailInclude,
  });
  const approved = new Set<string>(APPROVED_INVITATION_SLUGS);
  if (invitations.length !== approved.size ||
      new Set(invitations.map((invitation) => invitation.slug)).size !== approved.size ||
      invitations.some((invitation) => !approved.has(invitation.slug) || invitation.publishedVersion !== 1)) {
    throw new Error("Required version-1 invitation set is incomplete or changed.");
  }

  const publications = await client.invitationPublication.findMany({
    where: { invitationId: { in: invitations.map((invitation) => invitation.id) } },
    include: { media: { select: { mediaAssetId: true } } },
  });
  if (publications.some((publication) => publication.version !== 1 || publication.source !== "BASELINE") ||
      new Set(publications.map((publication) => publication.invitationId)).size !== publications.length) {
    throw new Error("Unexpected publication history exists for a version-1 invitation.");
  }
  const byInvitationId = new Map(publications.map((publication) => [publication.invitationId, publication]));
  const pending: Array<{ invitationId: string; contentDigest: string }> = [];

  for (const invitation of invitations) {
    // The public mapper proves the aggregate can still render; the snapshot
    // validator proves it can be restored with exact ordered content and media.
    mapPrismaToInvitation(invitation);
    const snapshot = buildPublicationSnapshot(invitation);
    const contentDigest = digestPublicationSnapshot(snapshot);
    if (!verifyPublicationSnapshot(snapshot, contentDigest, invitation.id, 1) ||
        snapshot.invitation.slug !== invitation.slug) {
      throw new Error("A published invitation cannot be reconstructed as a complete baseline.");
    }
    const mediaIds = publicationMediaIds(snapshot);
    const existing = byInvitationId.get(invitation.id);
    if (!existing) {
      pending.push({ invitationId: invitation.id, contentDigest });
      continue;
    }
    if (existing.schemaVersion !== 1 || existing.contentDigest !== contentDigest ||
        !verifyPublicationSnapshot(existing.snapshot, existing.contentDigest, invitation.id, 1) ||
        JSON.stringify(existing.media.map((pin) => pin.mediaAssetId).sort()) !== JSON.stringify(mediaIds)) {
      throw new Error("An existing baseline differs from the current invitation or its media pins.");
    }
  }

  return {
    total: approved.size,
    matching: approved.size - pending.length,
    missing: pending.length,
    pending,
  };
}

/** Default invocation never loads production configuration or opens a connection. */
export async function runProductionBaseline(options: ProductionBaselineOptions = {}): Promise<ProductionBaselineResult> {
  const execute = options.execute ?? process.argv.includes("--execute");
  const check = options.check ?? process.argv.includes("--check");
  if (!execute) {
    const message = "[Prod Baseline] Dry run: pass --check --execute for read-only inspection. No database connection opened.";
    console.log(message);
    return { executed: false, readOnly: true, matching: 0, missing: 0, message };
  }

  const config = options.config ?? loadProductionConfig();
  assertNeonDatabaseTargets({
    directUrl: config.DATABASE_URL,
    pooledUrl: config.DATABASE_URL_POOLED,
    approvedTarget: resolveApprovedTarget(options, config),
    requireApprovedTarget: true,
  });

  let client = options.customPrismaClient;
  if (!client) {
    const { PrismaClient } = await import("@/generated/prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    client = new PrismaClient({ adapter: new PrismaPg(config.DATABASE_URL) });
  }

  try {
    const initial = await inspectProductionBaselines(client);
    if (check) {
      const message = `[Prod Baseline] Read-only check passed: ${initial.matching} matching, ${initial.missing} missing of ${initial.total}.`;
      console.log(message);
      return { executed: true, readOnly: true, matching: initial.matching, missing: initial.missing, message };
    }

    const recordBaseline = options.recordBaseline ?? (async (db: PrismaClient, invitationId: string) => {
      const { createDraftRepository } = await import("@/features/admin/draft-repository");
      return createDraftRepository(db).recordBaselinePublication(invitationId);
    });
    for (const pending of initial.pending) {
      const written = await recordBaseline(client, pending.invitationId);
      if (written.contentDigest !== pending.contentDigest) {
        throw new Error("Baseline content changed during activation.");
      }
    }
    const verified = await inspectProductionBaselines(client);
    if (verified.missing !== 0 || verified.matching !== verified.total) {
      throw new Error("Baseline activation did not verify all historical invitations.");
    }
    const message = `[Prod Baseline] Activation verified: ${verified.matching} of ${verified.total} baselines match.`;
    console.log(message);
    return { executed: true, readOnly: false, matching: verified.matching, missing: 0, message };
  } catch {
    throw new Error("[Prod Baseline] Verification or activation failed safely. Raw errors suppressed.");
  } finally {
    await client.$disconnect();
  }
}

const isDirectExecution = Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runProductionBaseline().catch(() => {
    console.error("[Prod Baseline] Failed safely. Raw errors and connection strings suppressed.");
    process.exitCode = 1;
  });
}
