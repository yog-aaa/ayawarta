import { describe, expect, it } from "vitest";
import { inspectReleaseState, type ReleaseStateClient } from "./release-state";
import { CANONICAL_PRODUCTION_MEDIA } from "@/features/media/canonical-catalog";
import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";

const migrations = [
  { name: "001_init", checksum: "a".repeat(64) },
  { name: "002_complete", checksum: "b".repeat(64) },
];
const adminMigrations = [
  ...migrations,
  { name: "20261030060000_add_admin_drafts_and_siger_fields", checksum: "c".repeat(64) },
];
const a5Migrations = [
  ...adminMigrations,
  { name: "20261031060000_add_draft_media_provenance", checksum: "d".repeat(64) },
];
const baseTables = [
  "_prisma_migrations", "User", "MediaAsset", "Invitation", "InvitationSections",
  "Partner", "Event", "GalleryItem", "LoveStory", "GiftAccount",
  "InvitationDraft", "InvitationPublication", "InvitationPublicationMedia",
];
const seededCounts = [1, 31, 4, 4, 8, 6, 21, 6, 5];

function client(options: {
  tables?: string[];
  objects?: string[];
  counts?: number[];
  ledger?: Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null; logs: string | null }>;
  slugs?: string[];
  missingPartner?: boolean;
  mediaIds?: string[];
  adminCounts?: number[];
  draftMediaCount?: number;
} = {}): ReleaseStateClient {
  const counts = options.counts ?? seededCounts;
  const count = (index: number) => ({ count: async () => counts[index] });
  return {
    $queryRaw: async (query) => {
      const sql = query.join("");
      if (sql.includes("FROM pg_tables")) return (options.tables ?? baseTables).map((tablename) => ({ tablename }));
      if (sql.includes("FROM pg_class")) return (options.objects ?? []).map((object_name) => ({ object_name }));
      if (sql.includes("_prisma_migrations")) return options.ledger ?? migrations.map((migration) => ({
        migration_name: migration.name, checksum: migration.checksum,
        finished_at: new Date(), rolled_back_at: null, logs: null,
      }));
      throw new Error("Unexpected query in hermetic test.");
    },
    user: count(0),
    mediaAsset: {
      ...count(1),
      findMany: async () => (options.mediaIds ?? CANONICAL_PRODUCTION_MEDIA.map((asset) => asset.publicId))
        .map((publicId) => ({ publicId })),
    },
    invitation: {
      ...count(2),
      findMany: async () => (options.slugs ?? [...APPROVED_INVITATION_SLUGS]).map((slug) => ({
        slug, sections: {}, partners: options.missingPartner && slug === "rika-fauzi"
          ? [{ role: "GROOM" }] : [{ role: "GROOM" }, { role: "BRIDE" }],
      })),
    },
    invitationSections: count(3), partner: count(4), event: count(5),
    galleryItem: count(6), loveStory: count(7), giftAccount: count(8),
    invitationDraft: { count: async () => options.adminCounts?.[0] ?? 0 },
    invitationPublication: { count: async () => options.adminCounts?.[1] ?? 0 },
    invitationPublicationMedia: { count: async () => options.adminCounts?.[2] ?? 0 },
    draftMediaProvision: { count: async () => options.draftMediaCount ?? 0 },
  } as ReleaseStateClient;
}

describe("read-only production release state", () => {
  it("accepts only a completely empty public schema as uninitialized", async () => {
    await expect(inspectReleaseState(client({ tables: [] }), migrations)).resolves.toBe("uninitialized");
    await expect(inspectReleaseState(client({ tables: [], objects: ["leftover_enum"] }), migrations))
      .rejects.toThrow("residual objects");
  });

  it("allows bootstrap recovery only with every committed migration and zero rows", async () => {
    await expect(inspectReleaseState(client({ counts: Array(9).fill(0) }), migrations)).resolves.toBe("seed-ready");
    await expect(inspectReleaseState(client({ counts: Array(9).fill(0), tables: [...baseTables, "Unknown"] }), migrations))
      .rejects.toThrow("exact completed bootstrap schema");
    await expect(inspectReleaseState(client({ counts: Array(9).fill(0), adminCounts: [0, 1, 0] }), migrations))
      .rejects.toThrow("admin draft, publication, or media provenance data");
    await expect(inspectReleaseState(client({ counts: Array(9).fill(0), ledger: [{
      migration_name: "001_init", checksum: migrations[0].checksum,
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }] }), migrations)).rejects.toThrow("exact completed bootstrap schema");
  });

  it("rejects partial data and ambiguous or failed migration history", async () => {
    await expect(inspectReleaseState(client({ counts: [0, 2, 0, 0, 0, 0, 0, 0, 0] }), migrations))
      .rejects.toThrow("incomplete");
    await expect(inspectReleaseState(client({ ledger: [{
      migration_name: "001_init", checksum: migrations[0].checksum,
      finished_at: null, rolled_back_at: null, logs: "failed",
    }] }), migrations)).rejects.toThrow("ambiguous");
    await expect(inspectReleaseState(client({ ledger: [{
      migration_name: "001_init", checksum: "c".repeat(64),
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }] }), migrations)).rejects.toThrow("ambiguous");
    await expect(inspectReleaseState(client({ tables: baseTables.filter((name) => name !== "Partner") }), migrations))
      .rejects.toThrow("missing");
  });

  it("accepts seeded databases with added application tables and rows", async () => {
    await expect(inspectReleaseState(client({
      tables: [...baseTables, "Order", "AdminAudit"],
      counts: [3, 31, 5, 5, 10, 8, 23, 7, 6],
    }), migrations)).resolves.toBe("seeded");
    await expect(inspectReleaseState(client({ ledger: [{
      migration_name: "001_init", checksum: migrations[0].checksum,
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }] }), migrations)).resolves.toBe("seeded");
  });

  it("requires every A2 admin table on a populated seeded database", async () => {
    const adminLedger = adminMigrations.map((migration) => ({
      migration_name: migration.name, checksum: migration.checksum,
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }));
    await expect(inspectReleaseState(client({ ledger: adminLedger }), adminMigrations))
      .resolves.toBe("seeded");
    for (const missingTable of ["InvitationDraft", "InvitationPublication", "InvitationPublicationMedia"]) {
      await expect(inspectReleaseState(client({
        tables: baseTables.filter((name) => name !== missingTable), ledger: adminLedger,
      }), adminMigrations)).rejects.toThrow("Admin migration and required draft/publication tables disagree");
    }
  });

  it("requires the A5 table exactly when its committed migration was applied", async () => {
    const a5Ledger = a5Migrations.map((migration) => ({
      migration_name: migration.name, checksum: migration.checksum,
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }));
    const a5Tables = [...baseTables, "DraftMediaProvision"];
    await expect(inspectReleaseState(client({ tables: a5Tables, ledger: a5Ledger, draftMediaCount: 2 }), a5Migrations))
      .resolves.toBe("seeded");
    await expect(inspectReleaseState(client({ tables: baseTables, ledger: a5Ledger }), a5Migrations))
      .rejects.toThrow("A5 migration and draft-media table disagree");
    await expect(inspectReleaseState(client({ tables: a5Tables }), a5Migrations))
      .rejects.toThrow("A5 migration and draft-media table disagree");
  });

  it("requires zero A5 provenance rows for empty bootstrap recovery", async () => {
    const a5Ledger = a5Migrations.map((migration) => ({
      migration_name: migration.name, checksum: migration.checksum,
      finished_at: new Date(), rolled_back_at: null, logs: null,
    }));
    const input = { tables: [...baseTables, "DraftMediaProvision"], ledger: a5Ledger,
      counts: Array(9).fill(0) };
    await expect(inspectReleaseState(client(input), a5Migrations)).resolves.toBe("seed-ready");
    await expect(inspectReleaseState(client({ ...input, draftMediaCount: 1 }), a5Migrations))
      .rejects.toThrow("media provenance data");
  });

  it("rejects missing canonical seed identities without exact row-count requirements", async () => {
    await expect(inspectReleaseState(client({ slugs: APPROVED_INVITATION_SLUGS.slice(1) as string[] }), migrations))
      .rejects.toThrow("identities");
    await expect(inspectReleaseState(client({ mediaIds: CANONICAL_PRODUCTION_MEDIA.slice(1).map((asset) => asset.publicId) }), migrations))
      .rejects.toThrow("identities");
    await expect(inspectReleaseState(client({ missingPartner: true }), migrations))
      .rejects.toThrow("relationships");
  });
});
