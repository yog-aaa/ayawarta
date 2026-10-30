import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { CANONICAL_PRODUCTION_MEDIA } from "@/features/media/canonical-catalog";
import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";

export type ReleaseState = "uninitialized" | "seed-ready" | "seeded";

const BASE_TABLES = [
  "User", "MediaAsset", "Invitation", "InvitationSections", "Partner",
  "Event", "GalleryItem", "LoveStory", "GiftAccount",
];
const BOOTSTRAP_TABLES = [
  ...BASE_TABLES, "InvitationDraft", "InvitationPublication", "InvitationPublicationMedia",
];

type MigrationRow = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  logs: string | null;
};

export interface CommittedMigration { name: string; checksum: string }

export interface ReleaseStateClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  user: { count(): Promise<number> };
  mediaAsset: { count(): Promise<number>; findMany(args: unknown): Promise<Array<{ publicId: string }>> };
  invitation: { count(): Promise<number>; findMany(args: unknown): Promise<Array<{
    slug: string; sections: object | null; partners: Array<{ role: string }>;
  }>> };
  invitationSections: { count(): Promise<number> };
  partner: { count(): Promise<number> };
  event: { count(): Promise<number> };
  galleryItem: { count(): Promise<number> };
  loveStory: { count(): Promise<number> };
  giftAccount: { count(): Promise<number> };
  invitationDraft: { count(): Promise<number> };
  invitationPublication: { count(): Promise<number> };
  invitationPublicationMedia: { count(): Promise<number> };
}

export function committedMigrations(root = process.cwd()): CommittedMigration[] {
  const directory = path.join(root, "prisma", "migrations");
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(directory, entry.name, "migration.sql")))
    .map((entry) => ({
      name: entry.name,
      checksum: createHash("sha256").update(fs.readFileSync(path.join(directory, entry.name, "migration.sql"))).digest("hex"),
    })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Read-only gate for the release wrapper. Never returns target details or row contents. */
export async function inspectReleaseState(
  client: ReleaseStateClient,
  migrations: readonly CommittedMigration[] = committedMigrations()
): Promise<ReleaseState> {
  if (migrations.length === 0 || new Set(migrations.map((row) => row.name)).size !== migrations.length) {
    throw new Error("Committed migration inventory is invalid.");
  }

  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  const names = tables.map((row) => row.tablename);
  if (new Set(names).size !== names.length) throw new Error("Database table inventory is ambiguous.");

  if (names.length === 0) {
    const objects = await client.$queryRaw<Array<{ object_name: string }>>`
      SELECT c.relname AS object_name FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm', 'S', 'f', 'p')
      UNION ALL
      SELECT t.typname AS object_name FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e';
    `;
    if (objects.length !== 0) throw new Error("Uninitialized schema contains residual objects.");
    return "uninitialized";
  }

  if (!names.includes("_prisma_migrations") || BASE_TABLES.some((name) => !names.includes(name))) {
    throw new Error("Required application tables or migration ledger are missing.");
  }

  const ledger = await client.$queryRaw<MigrationRow[]>`
    SELECT migration_name, checksum, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations" ORDER BY started_at, migration_name;
  `;
  if (ledger.length === 0 || ledger.length > migrations.length) {
    throw new Error("Migration history is incomplete or ambiguous.");
  }
  for (let index = 0; index < ledger.length; index++) {
    const row = ledger[index];
    if (row.migration_name !== migrations[index].name || row.checksum !== migrations[index].checksum ||
        !row.finished_at || row.rolled_back_at || row.logs) {
      throw new Error("Migration history is incomplete or ambiguous.");
    }
  }

  const counts = await Promise.all([
    client.user.count(), client.mediaAsset.count(), client.invitation.count(),
    client.invitationSections.count(), client.partner.count(), client.event.count(),
    client.galleryItem.count(), client.loveStory.count(), client.giftAccount.count(),
  ]);
  if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) {
    throw new Error("Application row counts are invalid.");
  }

  if (counts.every((count) => count === 0)) {
    if (ledger.length !== migrations.length || names.length !== BOOTSTRAP_TABLES.length + 1 ||
        BOOTSTRAP_TABLES.some((name) => !names.includes(name))) {
      throw new Error("Empty schema is not an exact completed bootstrap schema.");
    }
    const adminCounts = await Promise.all([
      client.invitationDraft.count(), client.invitationPublication.count(),
      client.invitationPublicationMedia.count(),
    ]);
    if (adminCounts.some((count) => count !== 0)) {
      throw new Error("Empty schema contains admin draft or publication data.");
    }
    return "seed-ready";
  }

  // A routine release may have additional application tables and rows. These
  // durable seed identities must still exist; a partial seed cannot pass.
  if (counts[0] < 1 || counts[1] < CANONICAL_PRODUCTION_MEDIA.length ||
      counts[2] < APPROVED_INVITATION_SLUGS.length ||
      counts[3] < APPROVED_INVITATION_SLUGS.length ||
      counts[4] < APPROVED_INVITATION_SLUGS.length * 2) {
    throw new Error("Required bootstrap records are incomplete.");
  }
  const invitations = await client.invitation.findMany({
    where: { slug: { in: [...APPROVED_INVITATION_SLUGS] } },
    select: { slug: true, sections: { select: { invitationId: true } }, partners: { select: { role: true } } },
  });
  const media = await client.mediaAsset.findMany({
    where: { publicId: { in: CANONICAL_PRODUCTION_MEDIA.map((asset) => asset.publicId) } },
    select: { publicId: true },
  });
  if (new Set(invitations.map((row) => row.slug)).size !== APPROVED_INVITATION_SLUGS.length ||
      new Set(media.map((row) => row.publicId)).size !== CANONICAL_PRODUCTION_MEDIA.length) {
    throw new Error("Required bootstrap identities are incomplete.");
  }
  if (invitations.some((row) => !row.sections ||
      new Set(row.partners.map((partner) => partner.role)).size !== 2 ||
      !row.partners.some((partner) => partner.role === "GROOM") ||
      !row.partners.some((partner) => partner.role === "BRIDE"))) {
    throw new Error("Required bootstrap relationships are incomplete.");
  }
  return "seeded";
}
