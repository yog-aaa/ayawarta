import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { mapPrismaToInvitation } from "@/features/invitations/mapper";
import { invitationDetailInclude, type InvitationDetailPayload } from "@/features/invitations/query";
import { CANONICAL_TARGET_CLOUD_NAME } from "@/features/media/canonical-catalog";
import { listAssociatedMedia } from "./editor-media";
import { draftFromPublished } from "./draft-service";
import { isA5Enabled } from "./a5-feature";
import { findVerifiedDraftMedia, verifyDraftMediaReceipt } from "./draft-media-repository";
import { parseDraftForSave, validateDraftForPublish, type DraftFieldErrors, type DraftPayloadV1 } from "./draft-schema";
import {
  buildPublicationSnapshot, digestPublicationSnapshot, publicationMediaIds,
  verifyPublicationSnapshot,
} from "./publication-snapshot";

export class PublishError extends Error {
  constructor(
    public readonly code: "not_found" | "conflict" | "dependency_failure" | "validation",
    message: string,
    public readonly fieldErrors?: DraftFieldErrors,
  ) { super(message); this.name = "PublishError"; }
}

type Database = PrismaClient;
type Transaction = Prisma.TransactionClient;

const LEGACY_SLUGS = new Set(["rika-fauzi", "shidqi-mita", "dudi-aini", "default-preview"]);

async function defaultDatabase(): Promise<Database> {
  const { prisma } = await import("@/lib/server/db");
  return prisma;
}

function requireVersion(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new PublishError("validation", `${label} tidak valid.`);
}

function sameIds(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function referencedMedia(payload: DraftPayloadV1) {
  return [
    { field: "heroAssetId", id: payload.heroAssetId, type: "IMAGE" },
    { field: "partners.groom.photoAssetId", id: payload.partners.groom.photoAssetId, type: "IMAGE" },
    { field: "partners.bride.photoAssetId", id: payload.partners.bride.photoAssetId, type: "IMAGE" },
    { field: "musicAssetId", id: payload.musicAssetId, type: "AUDIO" },
    ...payload.galleryItems.map((item, index) => ({ field: `galleryItems.${index}.assetId`, id: item.assetId, type: "IMAGE" })),
  ] as const;
}

function currentSlot(live: InvitationDetailPayload, payload: DraftPayloadV1, field: string, id: string): boolean {
  if (field === "heroAssetId") return live.heroAssetId === id;
  if (field === "musicAssetId") return live.musicAssetId === id;
  if (field === "partners.groom.photoAssetId") return live.partners.find((row) => row.role === "GROOM")?.photoAssetId === id;
  if (field === "partners.bride.photoAssetId") return live.partners.find((row) => row.role === "BRIDE")?.photoAssetId === id;
  const index = /^galleryItems\.(\d+)\.assetId$/.exec(field);
  if (!index) return false;
  const row = payload.galleryItems[Number(index[1])];
  return Boolean(row && live.galleryItems.some((item) => item.id === row.key && item.assetId === id));
}

async function inspect(db: Transaction | Database, draftId: string) {
  const draft = await db.invitationDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new PublishError("not_found", "Draf tidak ditemukan.");
  if (!draft.invitationId) throw new PublishError("dependency_failure", "Undangan baru menunggu penyediaan media sebelum dapat diterbitkan.");
  const live = await db.invitation.findUnique({ where: { id: draft.invitationId }, include: invitationDetailInclude });
  if (!live) throw new PublishError("not_found", "Undangan terbit tidak ditemukan.");
  if (draft.basePublishedVersion !== live.publishedVersion) throw new PublishError("conflict", "Undangan terbit telah berubah. Muat ulang draf.");
  if (draft.proposedSlug !== live.slug) throw new PublishError("conflict", "Slug undangan terbit telah berubah.");
  const baseline = await db.invitationPublication.findUnique({
    where: { invitationId_version: { invitationId: live.id, version: 1 } },
    include: { media: { select: { mediaAssetId: true } } },
  });
  if (!baseline || (LEGACY_SLUGS.has(live.slug) ? baseline.source !== "BASELINE" :
      baseline.source !== "PUBLISH" || !baseline.actorId) || baseline.schemaVersion !== 1 ||
      !verifyPublicationSnapshot(baseline.snapshot, baseline.contentDigest, live.id, 1) ||
      !sameIds(baseline.media.map((item) => item.mediaAssetId), publicationMediaIds(baseline.snapshot))) {
    throw new PublishError("dependency_failure", "Riwayat awal undangan belum terverifikasi.");
  }
  if (baseline.source === "PUBLISH") {
    const owned = await findVerifiedDraftMedia(db, draft.id, publicationMediaIds(baseline.snapshot));
    if (owned.length !== publicationMediaIds(baseline.snapshot).length ||
        owned.some((row) => !verifyDraftMediaReceipt(row, CANONICAL_TARGET_CLOUD_NAME))) {
      throw new PublishError("dependency_failure", "Asal media publikasi pertama belum terverifikasi.");
    }
  }
  const current = live.publishedVersion === 1 ? baseline : await db.invitationPublication.findUnique({
    where: { invitationId_version: { invitationId: live.id, version: live.publishedVersion } },
    include: { media: { select: { mediaAssetId: true } } },
  });
  if (!current || current.schemaVersion !== 1 ||
      (live.publishedVersion > 1 && current.source !== "PUBLISH") ||
      !verifyPublicationSnapshot(current.snapshot, current.contentDigest, live.id, live.publishedVersion)) {
    throw new PublishError("dependency_failure", "Riwayat publikasi saat ini belum terverifikasi.");
  }
  mapPrismaToInvitation(live);
  const liveSnapshot = buildPublicationSnapshot(live);
  if (digestPublicationSnapshot(liveSnapshot) !== current.contentDigest ||
      !sameIds(current.media.map((item) => item.mediaAssetId), publicationMediaIds(liveSnapshot))) {
    throw new PublishError("conflict", "Isi publik berbeda dari riwayat terverifikasi. Hubungi administrator.");
  }
  if (draft.schemaVersion !== 1) throw new PublishError("dependency_failure", "Versi format draf belum didukung.");
  const parsed = parseDraftForSave(draft.payload);
  if (!parsed.ok) throw new PublishError("validation", "Periksa isi draf sebelum menerbitkan.", parsed.fieldErrors);
  const media = await listAssociatedMedia(db, live.id);
  const allowed = new Set(media.map((item) => item.id));
  const validated = validateDraftForPublish(parsed.payload, {
    existingPublishedSlug: live.slug, allowedMediaAssetIds: allowed,
    // The live public query still selects legacy columns before T5 activation.
    enabledThemes: ["classic-rose"],
  });
  if (!validated.ok) throw new PublishError("validation", "Periksa isi draf sebelum menerbitkan.", validated.fieldErrors);
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const errors: DraftFieldErrors = {};
  for (const ref of referencedMedia(validated.payload)) {
    if (!ref.id) continue;
    const asset = mediaById.get(ref.id);
    if (!asset?.deliverable || asset.resourceType !== ref.type ||
        (asset.shared && !currentSlot(live, validated.payload, ref.field, ref.id))) {
      errors[ref.field] = ["Media tidak terverifikasi untuk kolom undangan ini."];
    }
  }
  if (Object.keys(errors).length) throw new PublishError("validation", "Periksa pilihan media.", errors);
  return { draft, live, payload: validated.payload };
}

function draftMediaIds(payload: DraftPayloadV1): string[] {
  return [...new Set([
    payload.heroAssetId, payload.partners.groom.photoAssetId, payload.partners.bride.photoAssetId,
    ...payload.galleryItems.map((item) => item.assetId),
  ].filter((id): id is string => Boolean(id)))];
}

async function inspectNew(db: Transaction | Database, draftId: string) {
  if (!isA5Enabled()) throw new PublishError("dependency_failure", "Penerbitan undangan baru belum diaktifkan.");
  const draft = await db.invitationDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new PublishError("not_found", "Draf tidak ditemukan.");
  if (draft.invitationId || draft.basePublishedVersion !== null) throw new PublishError("conflict", "Draf sudah terhubung ke undangan terbit.");
  if (draft.schemaVersion !== 1) throw new PublishError("dependency_failure", "Versi format draf belum didukung.");
  const parsed = parseDraftForSave(draft.payload);
  if (!parsed.ok) throw new PublishError("validation", "Periksa isi draf sebelum menerbitkan.", parsed.fieldErrors);
  if (draft.proposedSlug !== parsed.payload.slug) throw new PublishError("conflict", "Slug draf berbeda dari isi yang disimpan.");
  const ids = draftMediaIds(parsed.payload);
  const rows = await findVerifiedDraftMedia(db, draft.id, ids);
  const byId = new Map(rows.map((row) => [row.mediaAssetId, row]));
  const allowed = new Set(rows.filter((row) => verifyDraftMediaReceipt(row, CANONICAL_TARGET_CLOUD_NAME)).map((row) => row.mediaAssetId!));
  const validated = validateDraftForPublish(parsed.payload, { allowedMediaAssetIds: allowed, enabledThemes: ["classic-rose"] });
  if (!validated.ok) throw new PublishError("validation", "Periksa isi draf sebelum menerbitkan.", validated.fieldErrors);
  if (validated.payload.musicAssetId) throw new PublishError("validation", "Musik baru belum tersedia untuk undangan baru.", { musicAssetId: ["Kosongkan musik untuk rilis ini."] });
  if (ids.some((id) => !byId.has(id) || !allowed.has(id))) {
    throw new PublishError("validation", "Semua foto harus terverifikasi milik draf ini.", { media: ["Periksa foto sampul, mempelai, dan galeri."] });
  }
  return { draft, payload: validated.payload };
}

export function summarizeChanges(live: InvitationDetailPayload, payload: DraftPayloadV1): string {
  const parts: string[] = [];
  if (live.theme !== payload.meta?.theme || live.variant !== payload.meta?.variant) parts.push("tema");
  // Classic Rose uses event display fields for its countdown; weddingDate and
  // greeting/prayer are not read by the current guest view.
  if (live.heroAssetId !== payload.heroAssetId || live.musicAssetId !== payload.musicAssetId) parts.push("media utama");
  const partnerView = (role: "GROOM" | "BRIDE", name: string, parents: string, instagram: string, photoAssetId: string | null) =>
    payload.sections.couple ? [role, name, parents, instagram, photoAssetId] : [role, name];
  if (JSON.stringify(live.partners.map((row) => partnerView(row.role, row.name, row.parents, row.instagram ?? "", row.photoAssetId)).sort()) !==
      JSON.stringify(["groom", "bride"].map((role) => { const row = payload.partners[role as "groom" | "bride"]; return partnerView(role === "groom" ? "GROOM" : "BRIDE", row.name, row.parents, row.instagram, row.photoAssetId); }).sort())) parts.push("mempelai");
  if (JSON.stringify(live.sections && [live.sections.couple, live.sections.events, live.sections.gallery, live.sections.loveStory, live.sections.gifts, live.sections.wishes]) !==
      JSON.stringify([payload.sections.couple, payload.sections.events, payload.sections.gallery, payload.sections.loveStory, payload.sections.gifts, payload.sections.wishes])) parts.push("visibilitas bagian");
  const ordered = <T extends { position: number }>(rows: T[]) => [...rows].sort((a, b) => a.position - b.position);
  if (payload.sections.events && JSON.stringify(ordered(live.events).map((row) => [row.name, row.displayDate, row.displayTime, row.location, row.address, row.mapUrl])) !==
      JSON.stringify(payload.events.map((row) => [row.name, row.displayDate, row.displayTime, row.location, row.address, row.mapUrl]))) parts.push("acara");
  // Classic Rose gallery renders images[], without per-image alt/caption.
  if (payload.sections.gallery && JSON.stringify(ordered(live.galleryItems).map((row) => row.assetId)) !==
      JSON.stringify(payload.galleryItems.map((row) => row.assetId))) parts.push("galeri");
  if (payload.sections.gallery && live.galleryVideoUrl !== (payload.galleryVideoUrl || null)) parts.push("video");
  if (payload.sections.loveStory && JSON.stringify(ordered(live.loveStories).map((row) => [row.title, row.content])) !== JSON.stringify(payload.loveStories.map((row) => [row.title, row.content]))) parts.push("cerita");
  if (payload.sections.gifts && JSON.stringify(ordered(live.giftAccounts).map((row) => [row.platform, row.accountHolder, row.accountNumber, row.logoPath])) !==
      JSON.stringify(payload.giftAccounts.map((row) => [row.platform, row.accountHolder, row.accountNumber, row.logoPath]))) parts.push("hadiah");
  return parts.length ? `Perubahan: ${parts.join(", ")}.` : "Tidak ada perubahan konten.";
}

async function replaceChildren(tx: Transaction, live: InvitationDetailPayload, payload: DraftPayloadV1) {
  const invitationId = live.id;
  await tx.invitationSections.update({ where: { invitationId }, data: payload.sections });
  for (const role of ["GROOM", "BRIDE"] as const) {
    const value = payload.partners[role === "GROOM" ? "groom" : "bride"];
    await tx.partner.update({ where: { invitationId_role: { invitationId, role } }, data: {
      name: value.name, parents: value.parents, instagram: value.instagram || null, photoAssetId: value.photoAssetId!,
    } });
  }
  await tx.event.deleteMany({ where: { invitationId } });
  await tx.galleryItem.deleteMany({ where: { invitationId } });
  await tx.loveStory.deleteMany({ where: { invitationId } });
  await tx.giftAccount.deleteMany({ where: { invitationId } });
  if (payload.events.length) await tx.event.createMany({ data: payload.events.map((row, index) => ({ invitationId, position: index + 1, name: row.name, displayDate: row.displayDate, displayTime: row.displayTime, location: row.location, address: row.address, mapUrl: row.mapUrl })) });
  if (payload.galleryItems.length) await tx.galleryItem.createMany({ data: payload.galleryItems.map((row, index) => ({ invitationId, position: index + 1, assetId: row.assetId!, altText: row.altText, caption: row.caption || null })) });
  if (payload.loveStories.length) await tx.loveStory.createMany({ data: payload.loveStories.map((row, index) => ({ invitationId, position: index + 1, title: row.title, content: row.content })) });
  if (payload.giftAccounts.length) await tx.giftAccount.createMany({ data: payload.giftAccounts.map((row, index) => ({ invitationId, position: index + 1, platform: row.platform, accountHolder: row.accountHolder, accountNumber: row.accountNumber, logoPath: row.logoPath })) });
}

export function createPublishRepository(customDb?: Database) {
  const getDb = () => customDb ? Promise.resolve(customDb) : defaultDatabase();
  return {
    async review(id: string) {
      const db = await getDb();
      const entry = await db.invitationDraft.findUnique({ where: { id }, select: { invitationId: true } });
      if (!entry) throw new PublishError("not_found", "Draf tidak ditemukan.");
      if (!entry.invitationId) {
        const { draft, payload } = await inspectNew(db, id);
        return { draftId: draft.id, invitationId: null, slug: payload.slug,
          draftVersion: draft.draftVersion, publishedVersion: null,
          changeSummary: "Undangan baru siap diterbitkan.", publicPath: `/${payload.slug}` };
      }
      const { draft, live, payload } = await inspect(db, id);
      return { draftId: draft.id, invitationId: live.id, slug: live.slug,
        draftVersion: draft.draftVersion, publishedVersion: live.publishedVersion,
        changeSummary: summarizeChanges(live, payload), publicPath: `/${live.slug}` };
    },
    async publish(input: { id: string; expectedDraftVersion: number; expectedPublishedVersion: number | null; confirmationSlug: string; actorId: string }) {
      requireVersion(input.expectedDraftVersion, "Versi draf");
      if (input.expectedPublishedVersion !== null) requireVersion(input.expectedPublishedVersion, "Versi publikasi");
      const db = await getDb();
      return db.$transaction(async (tx) => {
        const draftForLock = await tx.invitationDraft.findUnique({ where: { id: input.id }, select: { invitationId: true } });
        if (!draftForLock) throw new PublishError("not_found", "Draf tidak ditemukan.");
        if (!draftForLock.invitationId) {
          await tx.$queryRaw`SELECT "id" FROM "InvitationDraft" WHERE "id" = ${input.id} FOR UPDATE`;
          const { draft, payload } = await inspectNew(tx, input.id);
          if (input.expectedPublishedVersion !== null || draft.draftVersion !== input.expectedDraftVersion) {
            throw new PublishError("conflict", "Versi draf berubah. Muat ulang sebelum menerbitkan.");
          }
          if (payload.slug !== input.confirmationSlug) throw new PublishError("validation", "Konfirmasi slug tidak cocok.", { confirmationSlug: ["Ketik slug undangan yang benar."] });
          if (await tx.invitation.findUnique({ where: { slug: payload.slug }, select: { id: true } })) {
            throw new PublishError("conflict", "Slug undangan sudah digunakan.");
          }
          const created = await tx.invitation.create({ data: {
            slug: payload.slug, theme: payload.meta!.theme, variant: payload.meta!.variant,
            weddingDate: new Date(payload.weddingDate!), heroAssetId: payload.heroAssetId!,
            musicAssetId: null, galleryVideoUrl: payload.galleryVideoUrl || null,
            greeting: payload.greeting || null, prayer: payload.prayer || null,
            publishedVersion: 1, ownerId: input.actorId,
            sections: { create: payload.sections },
            partners: { create: (["groom", "bride"] as const).map((role) => ({
              role: role === "groom" ? "GROOM" as const : "BRIDE" as const,
              name: payload.partners[role].name, parents: payload.partners[role].parents,
              instagram: payload.partners[role].instagram || null,
              photoAssetId: payload.partners[role].photoAssetId!,
            })) },
            events: { create: payload.events.map((row, index) => ({ position: index + 1,
              name: row.name, displayDate: row.displayDate, displayTime: row.displayTime,
              location: row.location, address: row.address, mapUrl: row.mapUrl })) },
            galleryItems: { create: payload.galleryItems.map((row, index) => ({ position: index + 1,
              assetId: row.assetId!, altText: row.altText, caption: row.caption || null })) },
            loveStories: { create: payload.loveStories.map((row, index) => ({ position: index + 1, title: row.title, content: row.content })) },
            giftAccounts: { create: payload.giftAccounts.map((row, index) => ({ position: index + 1,
              platform: row.platform, accountHolder: row.accountHolder, accountNumber: row.accountNumber, logoPath: row.logoPath })) },
          } });
          const published = await tx.invitation.findUnique({ where: { id: created.id }, include: invitationDetailInclude });
          if (!published) throw new PublishError("dependency_failure", "Undangan baru tidak dapat dibaca setelah ditulis.");
          mapPrismaToInvitation(published);
          const snapshot = buildPublicationSnapshot(published);
          const mediaIds = publicationMediaIds(snapshot);
          if (mediaIds.some((id) => !draftMediaIds(payload).includes(id))) throw new PublishError("dependency_failure", "Media publikasi tidak sesuai draf.");
          await tx.invitationPublication.create({ data: {
            invitationId: created.id, version: 1, source: "PUBLISH", schemaVersion: 1,
            snapshot: snapshot as unknown as Prisma.InputJsonValue, contentDigest: digestPublicationSnapshot(snapshot),
            changeSummary: "Undangan baru diterbitkan.", actorId: input.actorId,
            media: { create: mediaIds.map((mediaAssetId) => ({ mediaAssetId })) },
          } });
          const retained = await tx.invitationDraft.updateMany({ where: {
            id: draft.id, invitationId: null, basePublishedVersion: null, draftVersion: input.expectedDraftVersion,
          }, data: {
            invitationId: created.id, basePublishedVersion: 1, draftVersion: { increment: 1 },
            proposedSlug: payload.slug, payload: draftFromPublished(published) as unknown as Prisma.InputJsonValue,
            updatedById: input.actorId,
          } });
          if (retained.count !== 1) throw new PublishError("conflict", "Draf berubah saat diterbitkan.");
          return { slug: payload.slug, version: 1, publicPath: `/${payload.slug}` };
        }
        await tx.$queryRaw`SELECT "id" FROM "Invitation" WHERE "id" = ${draftForLock.invitationId} FOR UPDATE`;
        const { draft, live, payload } = await inspect(tx, input.id);
        if (draft.draftVersion !== input.expectedDraftVersion || live.publishedVersion !== input.expectedPublishedVersion) {
          throw new PublishError("conflict", "Versi draf atau undangan berubah. Muat ulang sebelum menerbitkan.");
        }
        if (input.confirmationSlug !== live.slug) throw new PublishError("validation", "Konfirmasi slug tidak cocok.", { confirmationSlug: ["Ketik slug undangan yang benar."] });
        const changeSummary = summarizeChanges(live, payload);
        if (changeSummary === "Tidak ada perubahan konten.") {
          throw new PublishError("validation", "Belum ada perubahan konten untuk diterbitkan.", { form: ["Ubah isi draf sebelum menerbitkan kembali."] });
        }
        const nextVersion = live.publishedVersion + 1;
        const changed = await tx.invitation.updateMany({ where: { id: live.id, slug: live.slug, publishedVersion: live.publishedVersion }, data: {
          theme: payload.meta!.theme, variant: payload.meta!.variant, weddingDate: new Date(payload.weddingDate!),
          heroAssetId: payload.heroAssetId!, musicAssetId: payload.musicAssetId,
          galleryVideoUrl: payload.galleryVideoUrl || null, greeting: payload.greeting || null, prayer: payload.prayer || null,
          publishedVersion: nextVersion,
        } });
        if (changed.count !== 1) throw new PublishError("conflict", "Undangan berubah saat diterbitkan.");
        await replaceChildren(tx, live, payload);
        const published = await tx.invitation.findUnique({ where: { id: live.id }, include: invitationDetailInclude });
        if (!published) throw new PublishError("dependency_failure", "Isi undangan tidak dapat dibaca setelah perubahan.");
        mapPrismaToInvitation(published);
        const snapshot = buildPublicationSnapshot(published);
        const digest = digestPublicationSnapshot(snapshot);
        const mediaIds = publicationMediaIds(snapshot);
        await tx.invitationPublication.create({ data: {
          invitationId: live.id, version: nextVersion, source: "PUBLISH", schemaVersion: 1,
          snapshot: snapshot as unknown as Prisma.InputJsonValue, contentDigest: digest,
          changeSummary, actorId: input.actorId,
          media: { create: mediaIds.map((mediaAssetId) => ({ mediaAssetId })) },
        } });
        const retained = await tx.invitationDraft.updateMany({
          where: { id: draft.id, draftVersion: input.expectedDraftVersion, invitationId: live.id, basePublishedVersion: live.publishedVersion },
          data: {
            payload: draftFromPublished(published) as unknown as Prisma.InputJsonValue,
            proposedSlug: live.slug,
            basePublishedVersion: nextVersion,
            draftVersion: { increment: 1 },
            updatedById: input.actorId,
          },
        });
        if (retained.count !== 1) throw new PublishError("conflict", "Draf berubah saat diterbitkan.");
        return { slug: live.slug, version: nextVersion, publicPath: `/${live.slug}` };
      }, { isolationLevel: "Serializable" });
    },
  };
}
