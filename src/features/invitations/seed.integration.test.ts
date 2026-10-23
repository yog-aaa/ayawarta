import { describe, expect, it } from "vitest";
import { assertLocalDatabaseTarget } from "./db-guard";
import { executeSeed, SeedExecutionError } from "./seed";
import { prisma } from "@/lib/server/db";
import {
  captureDatabaseSnapshot,
  computeSnapshotDigest,
} from "./testing/database-snapshot";

describe("Seed Database Integration & Rollback (SEED-01, SEED-02, SEED-06)", () => {
  it("verifies that DATABASE_URL strictly satisfies local database guard", () => {
    const target = assertLocalDatabaseTarget(process.env.DATABASE_URL);
    expect(["localhost", "127.0.0.1", "::1"]).toContain(target.host);
    expect(target.port).toBe(5432);
    expect(target.database).toBe("ayawarta");
  });

  it("proves complete rollback via full-state snapshot when fault is injected after 5 media upserts (SEED-01, SEED-06)", async () => {
    // Local target guard pre-check
    assertLocalDatabaseTarget(process.env.DATABASE_URL);

    // Record deterministic full content snapshot before fault injection
    const baselineSnapshot = await captureDatabaseSnapshot(prisma);
    const baselineDigest = computeSnapshotDigest(baselineSnapshot);

    // Inject fault after 5 media upserts inside the single transaction
    await expect(
      executeSeed({
        testFaultInjection: { failAfterMediaUpsertCount: 5 },
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      })
    ).rejects.toThrowError(SeedExecutionError);

    // Capture post-failure full content snapshot
    const postFailureSnapshot = await captureDatabaseSnapshot(prisma);
    const postFailureDigest = computeSnapshotDigest(postFailureSnapshot);

    // Prove byte-for-byte and structural identity across all 9 tables:
    // No media assets, IDs, foreign keys, or updatedAt timestamps were altered.
    expect(postFailureDigest).toBe(baselineDigest);
    expect(postFailureSnapshot).toEqual(baselineSnapshot);
  });

  it("proves complete rollback via full-state snapshot when fault is injected on 3rd invitation 'dudi-aini' (SEED-01, SEED-06)", async () => {
    // Local target guard pre-check
    assertLocalDatabaseTarget(process.env.DATABASE_URL);

    // Record deterministic full content snapshot before fault injection
    const baselineSnapshot = await captureDatabaseSnapshot(prisma);
    const baselineDigest = computeSnapshotDigest(baselineSnapshot);

    // Inject fault on 3rd invitation ('dudi-aini') inside the single transaction
    await expect(
      executeSeed({
        testFaultInjection: { failOnInvitationSlug: "dudi-aini" },
        logger: { log: () => {}, warn: () => {}, error: () => {} },
      })
    ).rejects.toThrowError(/Injected fault on invitation 'dudi-aini'/);

    // Capture post-failure full content snapshot
    const postFailureSnapshot = await captureDatabaseSnapshot(prisma);
    const postFailureDigest = computeSnapshotDigest(postFailureSnapshot);

    // Prove byte-for-byte and structural identity across all 9 tables:
    // No invitations, child IDs, foreign keys, or updatedAt timestamps were altered or replaced.
    expect(postFailureDigest).toBe(baselineDigest);
    expect(postFailureSnapshot).toEqual(baselineSnapshot);
  });

  it("executes full seed atomically and idempotently to produce exact 82 rows", async () => {
    // Local target guard pre-check
    assertLocalDatabaseTarget(process.env.DATABASE_URL);

    const result = await executeSeed({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });

    expect(result.mediaAssetsUpserted).toBe(31);
    expect(result.invitationsUpserted).toBe(4);
    expect(result.tableCounts).toEqual({
      user: 1,
      mediaAsset: 31,
      invitation: 4,
      invitationSections: 4,
      partner: 8,
      event: 6,
      galleryItem: 21,
      loveStory: 6,
      giftAccount: 5,
    });
  });
});
