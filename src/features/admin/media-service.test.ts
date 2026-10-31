import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminSession } from "@/features/auth/service";
import { getServerEnv } from "@/lib/server/env";
import { createDraftRepository } from "./draft-repository";
import { createDraftMediaRepository, verifyDraftMediaReceipt } from "./draft-media-repository";
import { DraftMediaError } from "./draft-media-repository";
import { requireA5Enabled, A5UnavailableError } from "./a5-feature";
import { RealAdminMediaCloudClient } from "./media-cloudinary";
import { prepareAdminImage } from "./media-image";
import { createEmptyDraftPayload } from "./draft-schema";
import { preflightNewDraftMedia, recoverAdminDraftImage, uploadAdminDraftImage } from "./media-service";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/lib/server/env", () => ({ getServerEnv: vi.fn() }));
vi.mock("./draft-repository", () => ({ createDraftRepository: vi.fn() }));
vi.mock("./draft-media-repository", () => ({
  createDraftMediaRepository: vi.fn(), verifyDraftMediaReceipt: vi.fn(),
  DraftMediaError: class DraftMediaError extends Error { constructor(public readonly code: string, message: string) { super(message); } },
}));
vi.mock("./a5-feature", () => ({
  requireA5Enabled: vi.fn(),
  A5UnavailableError: class A5UnavailableError extends Error { constructor() { super("Disabled"); } },
}));
vi.mock("./media-cloudinary", () => ({
  RealAdminMediaCloudClient: vi.fn(), verifyAdminCloudImage: vi.fn(),
  AdminCloudIdentityError: class AdminCloudIdentityError extends Error { constructor() { super("Cloud identity mismatch"); } },
}));
vi.mock("./media-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./media-image")>()), prepareAdminImage: vi.fn(),
}));

const key = "11111111-1111-4111-8111-111111111111";
const provisionId = "22222222-2222-4222-8222-222222222222";
const prepared = { buffer: Buffer.from("prepared"), sha256: "a".repeat(64), format: "webp" as const, width: 800, height: 1000, bytes: 100 };
const remote = { assetId: "cloud-1", publicId: "ayawarta/production/invitations/draft-draft-1/images/p-a", secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/draft-draft-1/images/p-a.webp", resourceType: "image", format: "webp", version: 1, bytes: 100, width: 800, height: 1000 };
const provision = { id: provisionId, draftId: "draft-1", state: "RESERVED", publicId: remote.publicId, slot: "cover", format: "webp", width: 800, height: 1000, bytes: 100, preparedSha256: prepared.sha256, mediaAsset: null };
const verified = { ...provision, state: "VERIFIED", mediaAsset: { id: "asset-1", secureUrl: remote.secureUrl, originalName: "Foto sampul.webp" } };
const draft = { id: "draft-1", invitationId: null, draftVersion: 2, payload: createEmptyDraftPayload() };
const draftRepo = { findDraftById: vi.fn() };
const mediaRepo = { reserve: vi.fn(), findByIdForDraft: vi.fn(), finalizeVerified: vi.fn(), listVerifiedForDraft: vi.fn() };
const cloud = { read: vi.fn(), upload: vi.fn(), contentSha256: vi.fn() };

describe("A5 authenticated media service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN" });
    vi.mocked(getServerEnv).mockReturnValue({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "uhwi7xvb", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" } as never);
    vi.mocked(createDraftRepository).mockReturnValue(draftRepo as unknown as ReturnType<typeof createDraftRepository>);
    vi.mocked(createDraftMediaRepository).mockReturnValue(mediaRepo as unknown as ReturnType<typeof createDraftMediaRepository>);
    vi.mocked(RealAdminMediaCloudClient).mockImplementation(function FakeAdminCloudClient() { return cloud as never; });
    vi.mocked(prepareAdminImage).mockResolvedValue(prepared);
    vi.mocked(verifyDraftMediaReceipt).mockReturnValue(true);
    draftRepo.findDraftById.mockResolvedValue(draft);
    mediaRepo.reserve.mockResolvedValue({ provision, created: true });
    mediaRepo.findByIdForDraft.mockResolvedValue(provision);
    mediaRepo.finalizeVerified.mockResolvedValue(verified);
    cloud.read.mockResolvedValue(remote);
    cloud.upload.mockResolvedValue(remote);
    cloud.contentSha256.mockResolvedValue(prepared.sha256);
  });

  const input = { draftId: "draft-1", expectedDraftVersion: 2, idempotencyKey: key, slot: "hero", contentType: "image/jpeg", bytes: Buffer.from("source") };

  it("checks admin and feature gate before any draft/media query", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: false, code: "unauthorized" });
    expect(createDraftRepository).not.toHaveBeenCalled();
    vi.mocked(requireA5Enabled).mockImplementationOnce(() => { throw new A5UnavailableError(); });
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: false, code: "dependency_failure" });
    expect(createDraftMediaRepository).not.toHaveBeenCalled();
  });

  it("rejects stale draft versions before provider mutation", async () => {
    draftRepo.findDraftById.mockResolvedValueOnce({ ...draft, draftVersion: 3 });
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: false, code: "conflict" });
    expect(mediaRepo.reserve).not.toHaveBeenCalled();
    expect(cloud.upload).not.toHaveBeenCalled();
  });

  it("reserves using the saved version, uploads once, verifies readback, and returns scoped asset", async () => {
    cloud.read.mockResolvedValueOnce(null).mockResolvedValueOnce(remote);
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: true, data: {
      state: "verified", provisionId, asset: { id: "asset-1", width: 800, height: 1000, format: "webp" },
    } });
    expect(mediaRepo.reserve).toHaveBeenCalledWith(expect.objectContaining({
      draftId: "draft-1", slot: "cover", idempotencyKey: key, expectedDraftVersion: 2, sha256: prepared.sha256,
    }));
    expect(cloud.upload).toHaveBeenCalledOnce();
    expect(cloud.contentSha256).toHaveBeenCalledWith(remote.secureUrl, 100);
    expect(mediaRepo.finalizeVerified).toHaveBeenCalledWith(expect.objectContaining({ provisionId, cloudinaryAssetId: "cloud-1", originalName: "Foto sampul.webp" }));
  });

  it("returns a safe recovery ID if remote succeeded but DB finalization fails", async () => {
    mediaRepo.finalizeVerified.mockRejectedValueOnce(new Error("DB unavailable"));
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: false, code: "dependency_failure", recoveryId: provisionId });
  });

  it("keeps the recovery ID when finalization reports a receipt conflict", async () => {
    mediaRepo.finalizeVerified.mockRejectedValueOnce(new DraftMediaError("conflict", "receipt differs"));
    expect(await uploadAdminDraftImage(input)).toMatchObject({ ok: false, code: "conflict", recoveryId: provisionId });
  });

  it("recovers an existing remote asset without the original file", async () => {
    expect(await recoverAdminDraftImage({ draftId: "draft-1", provisionId, expectedDraftVersion: 2 })).toMatchObject({ ok: true, data: { provisionId, asset: { id: "asset-1" } } });
    expect(cloud.upload).not.toHaveBeenCalled();
  });

  it("reports a missing remote asset as pending with the same recovery ID", async () => {
    cloud.read.mockResolvedValueOnce(null);
    expect(await recoverAdminDraftImage({ draftId: "draft-1", provisionId, expectedDraftVersion: 2 })).toMatchObject({ ok: false, code: "dependency_failure", recoveryId: provisionId });
    expect(mediaRepo.finalizeVerified).not.toHaveBeenCalled();
  });

  it("requires every own remote image to exist before first-publication transaction", async () => {
    const payload = createEmptyDraftPayload();
    payload.slug = "damar-raras";
    payload.weddingDate = "2027-06-12T02:00:00.000Z";
    payload.heroAssetId = "hero-id";
    payload.partners.groom = { name: "Damar", parents: "", instagram: "", photoAssetId: "groom-id" };
    payload.partners.bride = { name: "Raras", parents: "", instagram: "", photoAssetId: "bride-id" };
    payload.events = [{ key: "event-1", name: "Upacara Pernikahan", displayDate: "12 Juni 2027", displayTime: "09.00 WIB", location: "Bandung", address: "Bandung", mapUrl: "https://maps.example.com" }];
    draftRepo.findDraftById.mockResolvedValue({ ...draft, payload });
    const rows = ["hero-id", "groom-id", "bride-id"].map((mediaAssetId) => ({ ...verified, mediaAssetId,
      cloudinaryAssetId: "cloud-1", mediaAsset: { ...verified.mediaAsset, id: mediaAssetId } }));
    mediaRepo.listVerifiedForDraft.mockResolvedValue(rows);
    cloud.read.mockResolvedValueOnce(null);
    expect(await preflightNewDraftMedia("draft-1", 2)).toMatchObject({ ok: false, code: "conflict" });
    expect(cloud.contentSha256).not.toHaveBeenCalled();
    cloud.read.mockResolvedValue(remote);
    expect(await preflightNewDraftMedia("draft-1", 2)).toMatchObject({ ok: true, data: null });
    expect(cloud.read).toHaveBeenCalledTimes(4);
    expect(cloud.contentSha256).toHaveBeenCalledTimes(3);
  });
});
