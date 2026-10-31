import "server-only";

import { requireAdminSession } from "@/features/auth/service";
import { getServerEnv } from "@/lib/server/env";
import { createDraftRepository } from "./draft-repository";
import { createDraftMediaRepository, DraftMediaError, verifyDraftMediaReceipt } from "./draft-media-repository";
import type { AdminDraftResult } from "./draft-service";
import { parseDraftForSave, validateDraftForPublish } from "./draft-schema";
import { A5UnavailableError, requireA5Enabled } from "./a5-feature";
import { AdminCloudIdentityError, RealAdminMediaCloudClient, verifyAdminCloudImage, type AdminCloudImage, type AdminMediaCloudClient } from "./media-cloudinary";
import { AdminImageInputError, parseAdminImageSlot, prepareAdminImage, type AdminImageSlot } from "./media-image";

export interface AdminVerifiedImage {
  state: "verified";
  provisionId: string;
  asset: { id: string; url: string; width: number; height: number; format: "webp" };
}

export interface AdminUploadImageInput {
  draftId: string;
  expectedDraftVersion: number;
  idempotencyKey: string;
  slot: string;
  contentType: string;
  bytes: Buffer;
}

export interface AdminRecoverImageInput {
  draftId: string;
  provisionId: string;
  expectedDraftVersion: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function invalid(message: string, field: string): AdminDraftResult<never> {
  return { ok: false, code: "validation", message, fieldErrors: { [field]: [message] } };
}

function mapError(error: unknown, recoveryId?: string): AdminDraftResult<never> {
  if (error instanceof AdminImageInputError) return invalid(error.message, error.field);
  if (error instanceof A5UnavailableError) return { ok: false, code: "dependency_failure", message: error.message };
  if (error instanceof DraftMediaError) {
    if (error.code === "not_found") return { ok: false, code: "not_found", message: "Draf atau unggahan tidak ditemukan." };
    if (error.code === "conflict") return { ok: false, code: "conflict", message: "Unggahan berubah atau kunci pengulangan tidak cocok.", ...(recoveryId ? { recoveryId } : {}) };
    return { ok: false, code: "conflict", message: "Keadaan draf telah berubah. Muat ulang sebelum mengunggah.", ...(recoveryId ? { recoveryId } : {}) };
  }
  if (error instanceof AdminCloudIdentityError) return { ok: false, code: "conflict", message: "Identitas foto di penyimpanan tidak sesuai. Hubungi administrator." };
  if (error instanceof Error && error.message === "Unauthorized") return { ok: false, code: "unauthorized", message: "Silakan masuk sebagai administrator." };
  if (error instanceof Error && error.message === "Forbidden") return { ok: false, code: "forbidden", message: "Akses administrator tidak tersedia." };
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  if (typeof code === "string" && ["P1001", "P1002", "P1017", "P2021", "P2022"].includes(code)) {
    return { ok: false, code: "dependency_failure", message: "Penyimpanan media belum tersedia. Coba lagi.", ...(recoveryId ? { recoveryId } : {}) };
  }
  return { ok: false, code: "dependency_failure", message: "Foto belum dapat disimpan. Coba pemulihan unggahan.", ...(recoveryId ? { recoveryId } : {}) };
}

function assertInput(input: AdminUploadImageInput): AdminImageSlot {
  if (!input.draftId || input.draftId.length > 120) throw new AdminImageInputError("slot", "Draf tidak valid.");
  if (!Number.isSafeInteger(input.expectedDraftVersion) || input.expectedDraftVersion < 1) throw new AdminImageInputError("slot", "Versi draf tidak valid.");
  if (!UUID.test(input.idempotencyKey)) throw new AdminImageInputError("slot", "Kunci unggahan tidak valid.");
  return parseAdminImageSlot(input.slot);
}

function storedSlot(slot: AdminImageSlot): string { return slot === "hero" ? "cover" : slot; }

async function currentNewDraft(draftId: string, expectedDraftVersion: number, slot?: AdminImageSlot) {
  const row = await createDraftRepository().findDraftById(draftId);
  if (!row) throw new DraftMediaError("not_found", "Draft not found");
  if (row.invitationId || row.draftVersion !== expectedDraftVersion) throw new DraftMediaError("conflict", "Draft changed");
  const parsed = parseDraftForSave(row.payload);
  if (!parsed.ok) throw new DraftMediaError("invalid_state", "Draft payload is invalid");
  if (slot?.startsWith("gallery:") && !parsed.payload.galleryItems.some((item) => item.key === slot.slice(8))) {
    throw new AdminImageInputError("slot", "Simpan baris galeri sebelum mengunggah foto.");
  }
  return row;
}

function cloudClient(): AdminMediaCloudClient {
  const env = getServerEnv();
  return new RealAdminMediaCloudClient({
    cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  });
}

function readyDto(provision: Awaited<ReturnType<ReturnType<typeof createDraftMediaRepository>["findByIdForDraft"]>>): AdminVerifiedImage {
  if (!provision || !verifyDraftMediaReceipt(provision, "uhwi7xvb") || !provision.mediaAsset) throw new AdminCloudIdentityError();
  return {
    state: "verified",
    provisionId: provision.id,
    asset: {
      id: provision.mediaAsset.id,
      url: provision.mediaAsset.secureUrl,
      width: provision.width,
      height: provision.height,
      format: "webp",
    },
  };
}

async function verifyRemote(
  cloud: AdminMediaCloudClient,
  image: AdminCloudImage,
  receipt: { publicId: string; format: string; bytes: number; width: number; height: number; sha256: string },
): Promise<void> {
  verifyAdminCloudImage(image, { format: receipt.format as "webp", bytes: receipt.bytes, width: receipt.width, height: receipt.height }, receipt.publicId, "uhwi7xvb");
  if (await cloud.contentSha256(image.secureUrl, receipt.bytes) !== receipt.sha256) throw new AdminCloudIdentityError();
}

/** Server-facing operation. The A5 and admin gates execute before new-table access or provider calls. */
export async function uploadAdminDraftImage(input: AdminUploadImageInput): Promise<AdminDraftResult<AdminVerifiedImage>> {
  let recoveryId: string | undefined;
  try {
    const admin = await requireAdminSession();
    requireA5Enabled();
    const slot = assertInput(input);
    await currentNewDraft(input.draftId, input.expectedDraftVersion, slot);
    const prepared = await prepareAdminImage(input.bytes, input.contentType, slot);
    const repo = createDraftMediaRepository();
    const { provision } = await repo.reserve({
      draftId: input.draftId, slot: storedSlot(slot), idempotencyKey: input.idempotencyKey,
      expectedDraftVersion: input.expectedDraftVersion,
      sha256: prepared.sha256, format: prepared.format, width: prepared.width,
      height: prepared.height, bytes: prepared.bytes,
      actorId: admin.id,
    });
    if (provision.state === "VERIFIED") return { ok: true, data: readyDto(provision) };
    recoveryId = provision.id;
    const cloud = cloudClient();
    const existing = await cloud.read(provision.publicId);
    const uploaded = existing ? null : await cloud.upload(prepared.buffer, provision.publicId);
    const readback = existing ?? await cloud.read(provision.publicId);
    if (!readback || (uploaded && readback.assetId !== uploaded.assetId)) throw new AdminCloudIdentityError();
    await verifyRemote(cloud, readback, { publicId: provision.publicId, format: provision.format,
      bytes: provision.bytes, width: provision.width, height: provision.height, sha256: provision.preparedSha256 });
    const verified = await repo.finalizeVerified({
      draftId: input.draftId, provisionId: provision.id, cloudinaryAssetId: readback.assetId,
      publicId: provision.publicId, secureUrl: readback.secureUrl, resourceType: "IMAGE",
      format: provision.format, width: provision.width, height: provision.height, bytes: provision.bytes,
      originalName: slot === "hero" ? "Foto sampul.webp" : slot === "groom" ? "Foto mempelai pria.webp" :
        slot === "bride" ? "Foto mempelai wanita.webp" : "Foto galeri.webp",
    });
    return { ok: true, data: readyDto(verified) };
  } catch (error) { return mapError(error, recoveryId); }
}

/** Looks up a reserved remote resource without needing the original file. */
export async function recoverAdminDraftImage(input: AdminRecoverImageInput): Promise<AdminDraftResult<AdminVerifiedImage>> {
  try {
    await requireAdminSession();
    requireA5Enabled();
    if (!input.draftId || !UUID.test(input.provisionId) || !Number.isSafeInteger(input.expectedDraftVersion) || input.expectedDraftVersion < 1) {
      return invalid("Permintaan pemulihan tidak valid.", "form");
    }
    await currentNewDraft(input.draftId, input.expectedDraftVersion);
    const repo = createDraftMediaRepository();
    const provision = await repo.findByIdForDraft(input.draftId, input.provisionId);
    if (!provision) return { ok: false, code: "not_found", message: "Unggahan tidak ditemukan." };
    if (provision.state === "VERIFIED") return { ok: true, data: readyDto(provision) };
    const cloud = cloudClient();
    const remote = await cloud.read(provision.publicId);
    if (!remote) return { ok: false, code: "dependency_failure", recoveryId: provision.id, message: "Foto belum sampai ke penyimpanan. Unggah ulang berkas yang sama." };
    await verifyRemote(cloud, remote, { publicId: provision.publicId, format: provision.format,
      bytes: provision.bytes, width: provision.width, height: provision.height, sha256: provision.preparedSha256 });
    const verified = await repo.finalizeVerified({
      draftId: input.draftId, provisionId: provision.id, cloudinaryAssetId: remote.assetId,
      publicId: provision.publicId, secureUrl: remote.secureUrl, resourceType: "IMAGE",
      format: provision.format, width: provision.width, height: provision.height, bytes: provision.bytes,
      originalName: "Foto undangan.webp",
    });
    return { ok: true, data: readyDto(verified) };
  } catch (error) { return mapError(error, input.provisionId); }
}

/** Cloudinary readback happens before the short serializable publication transaction. */
export async function preflightNewDraftMedia(draftId: string, expectedDraftVersion: number): Promise<AdminDraftResult<null>> {
  try {
    await requireAdminSession();
    requireA5Enabled();
    const draft = await currentNewDraft(draftId, expectedDraftVersion);
    const parsed = parseDraftForSave(draft.payload);
    if (!parsed.ok) return { ok: false, code: "validation", message: "Periksa isi draf.", fieldErrors: parsed.fieldErrors };
    if (parsed.payload.musicAssetId) return invalid("Musik baru belum tersedia untuk rilis ini.", "musicAssetId");
    const ids = [...new Set([
      parsed.payload.heroAssetId, parsed.payload.partners.groom.photoAssetId,
      parsed.payload.partners.bride.photoAssetId, ...parsed.payload.galleryItems.map((item) => item.assetId),
    ].filter((id): id is string => Boolean(id)))];
    const rows = await createDraftMediaRepository().listVerifiedForDraft(draftId);
    const byId = new Map(rows.map((row) => [row.mediaAssetId, row]));
    const allowed = new Set(rows.filter((row) => verifyDraftMediaReceipt(row, "uhwi7xvb")).map((row) => row.mediaAssetId!));
    const validated = validateDraftForPublish(parsed.payload, { allowedMediaAssetIds: allowed, enabledThemes: ["classic-rose"] });
    if (!validated.ok) return { ok: false, code: "validation", message: "Periksa isi draf sebelum menerbitkan.", fieldErrors: validated.fieldErrors };
    if (ids.some((id) => !allowed.has(id))) return invalid("Semua foto harus terverifikasi milik draf ini.", "media");
    const cloud = cloudClient();
    for (const id of ids) {
      const row = byId.get(id);
      if (!row || !verifyDraftMediaReceipt(row, "uhwi7xvb")) return invalid("Foto undangan belum terverifikasi.", "media");
      const remote = await cloud.read(row.publicId);
      if (!remote || remote.assetId !== row.cloudinaryAssetId) throw new AdminCloudIdentityError();
      await verifyRemote(cloud, remote, { publicId: row.publicId, format: row.format,
        bytes: row.bytes, width: row.width, height: row.height, sha256: row.preparedSha256 });
    }
    return { ok: true, data: null };
  } catch (error) { return mapError(error); }
}
