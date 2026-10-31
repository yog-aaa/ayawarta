import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { loadProductionConfig } from "@/features/invitations/production-env";
import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";
import { publishedFixture } from "@/features/admin/testing/published-fixture";
import {
  buildPublicationSnapshot,
  digestPublicationSnapshot,
  publicationMediaIds,
} from "@/features/admin/publication-snapshot";
import { inspectProductionBaselines, runProductionBaseline } from "./baseline";

const config = loadProductionConfig({
  explicitEnv: {
    DATABASE_URL: "postgresql://test:test@ep-test-target-123.us-east-2.aws.neon.tech/ayawarta?sslmode=require",
    DATABASE_URL_POOLED: "postgresql://test:test@ep-test-target-123-pooler.us-east-2.aws.neon.tech/ayawarta?sslmode=require",
    APPROVED_NEON_TARGET_FINGERPRINT: "ep-test-target-123:ayawarta:test",
  },
  ignoreProcessEnvConflicts: true,
});

function fixtures() {
  return APPROVED_INVITATION_SLUGS.map((slug, index) => {
    const invitation = publishedFixture();
    invitation.id = `inv-${index + 1}`;
    invitation.slug = slug;
    return invitation;
  });
}

function baseline(invitation: ReturnType<typeof publishedFixture>) {
  const snapshot = buildPublicationSnapshot(invitation);
  return {
    invitationId: invitation.id,
    version: 1,
    source: "BASELINE",
    schemaVersion: 1,
    snapshot,
    contentDigest: digestPublicationSnapshot(snapshot),
    media: publicationMediaIds(snapshot).map((mediaAssetId) => ({ mediaAssetId })),
  };
}

function mockClient(
  invitations = fixtures(),
  publications: Array<ReturnType<typeof baseline>> = [],
) {
  const findManyInvitations = vi.fn().mockImplementation(async () => invitations);
  const findManyPublications = vi.fn().mockImplementation(async () => publications);
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const client = {
    invitation: { findMany: findManyInvitations },
    invitationPublication: { findMany: findManyPublications },
    $disconnect: disconnect,
  } as unknown as PrismaClient;
  return { client, invitations, publications, findManyInvitations, findManyPublications, disconnect };
}

describe("guarded production baseline preparation", () => {
  it("defaults to a dry run without loading config or opening a database connection", async () => {
    const db = mockClient();
    const result = await runProductionBaseline({ execute: false, customPrismaClient: db.client });
    expect(result).toMatchObject({ executed: false, readOnly: true });
    expect(db.findManyInvitations).not.toHaveBeenCalled();
    expect(db.disconnect).not.toHaveBeenCalled();
  });

  it("rejects an unapproved target before invoking an injected client", async () => {
    const db = mockClient();
    await expect(runProductionBaseline({
      execute: true,
      check: true,
      config,
      approvedTarget: "ep-another-target:ayawarta:test",
      customPrismaClient: db.client,
    })).rejects.toThrow();
    expect(db.findManyInvitations).not.toHaveBeenCalled();
    expect(db.disconnect).not.toHaveBeenCalled();
  });

  it("read-only check verifies four complete live aggregates and reports missing baselines", async () => {
    const db = mockClient();
    const write = vi.fn();
    const result = await runProductionBaseline({ execute: true, check: true, config, customPrismaClient: db.client, recordBaseline: write });
    expect(result).toMatchObject({ executed: true, readOnly: true, matching: 0, missing: 4 });
    expect(write).not.toHaveBeenCalled();
    expect(db.disconnect).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing or modified member of the approved version-1 set", async () => {
    const missing = mockClient(fixtures().slice(1));
    await expect(inspectProductionBaselines(missing.client)).rejects.toThrow(/version-1 invitation set/);
    const changed = fixtures();
    changed[0].publishedVersion = 2;
    await expect(inspectProductionBaselines(mockClient(changed).client)).rejects.toThrow(/version-1 invitation set/);
  });

  it("accepts a partial set of exact baselines and rejects digest or pin mismatches", async () => {
    const invitations = fixtures();
    const existing = baseline(invitations[0]);
    const db = mockClient(invitations, [existing]);
    expect(await inspectProductionBaselines(db.client)).toMatchObject({ matching: 1, missing: 3 });

    existing.media = [];
    await expect(inspectProductionBaselines(db.client)).rejects.toThrow(/existing baseline differs/);
    existing.media = publicationMediaIds(existing.snapshot).map((mediaAssetId) => ({ mediaAssetId }));
    existing.contentDigest = "0".repeat(64);
    await expect(inspectProductionBaselines(db.client)).rejects.toThrow(/existing baseline differs/);
  });

  it("rejects unexpected publication history for a version-1 invitation", async () => {
    const invitations = fixtures();
    const unexpected = { ...baseline(invitations[0]), version: 2 };
    await expect(inspectProductionBaselines(mockClient(invitations, [unexpected]).client))
      .rejects.toThrow(/Unexpected publication history/);
  });

  it("writes only missing baselines through the repository seam, then verifies all four", async () => {
    const invitations = fixtures();
    const db = mockClient(invitations, [baseline(invitations[0])]);
    const write = vi.fn().mockImplementation(async (_client: PrismaClient, invitationId: string) => {
      const invitation = invitations.find((row) => row.id === invitationId);
      if (!invitation) throw new Error("missing fixture");
      const publication = baseline(invitation);
      db.publications.push(publication);
      return { contentDigest: publication.contentDigest };
    });
    const result = await runProductionBaseline({ execute: true, check: false, config, customPrismaClient: db.client, recordBaseline: write });
    expect(result).toMatchObject({ executed: true, readOnly: false, matching: 4, missing: 0 });
    expect(write).toHaveBeenCalledTimes(3);
    expect(db.findManyPublications).toHaveBeenCalledTimes(2);
    expect(db.disconnect).toHaveBeenCalledTimes(1);
  });

  it("fails closed if a writer's digest differs from the preflight digest", async () => {
    const db = mockClient();
    const write = vi.fn().mockResolvedValue({ contentDigest: "0".repeat(64) });
    await expect(runProductionBaseline({ execute: true, check: false, config, customPrismaClient: db.client, recordBaseline: write }))
      .rejects.toThrow("[Prod Baseline] Verification or activation failed safely. Raw errors suppressed.");
    expect(write).toHaveBeenCalledTimes(1);
    expect(db.disconnect).toHaveBeenCalledTimes(1);
  });
});
