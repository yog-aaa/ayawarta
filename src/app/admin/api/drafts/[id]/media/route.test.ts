import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdminSession } from "@/features/auth/service";
import { requireA5Enabled } from "@/features/admin/a5-feature";
import { uploadAdminDraftImage } from "@/features/admin/media-service";
import { MAX_ADMIN_IMAGE_INPUT_BYTES } from "@/features/admin/media-image";
import { POST } from "./route";

vi.mock("@/features/auth/service", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/features/admin/a5-feature", () => ({ requireA5Enabled: vi.fn() }));
vi.mock("@/features/admin/media-service", () => ({ uploadAdminDraftImage: vi.fn() }));

const headers = {
  Origin: "http://localhost:3000",
  "Content-Type": "image/jpeg",
  "Idempotency-Key": "11111111-1111-4111-8111-111111111111",
  "X-AyaWarta-Media-Slot": "hero",
  "X-AyaWarta-Draft-Version": "2",
};
const context = { params: Promise.resolve({ id: "draft-1" }) };

describe("admin raw image upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({ id: "admin-1", name: "Admin", email: "admin@example.com", role: "ADMIN" });
    vi.mocked(uploadAdminDraftImage).mockResolvedValue({ ok: false, code: "validation", message: "Invalid image" });
  });

  it("checks live auth and default-off A5 gate before reading or uploading", async () => {
    vi.mocked(requireAdminSession).mockRejectedValueOnce(new Error("Unauthorized"));
    const denied = await POST(new Request("http://localhost:3000/admin/api/drafts/draft-1/media", { method: "POST", headers, body: "x" }), context);
    expect(denied.status).toBe(401);
    expect(requireA5Enabled).not.toHaveBeenCalled();
    vi.mocked(requireA5Enabled).mockImplementationOnce(() => { throw new Error("disabled"); });
    const disabled = await POST(new Request("http://localhost:3000/admin/api/drafts/draft-1/media", { method: "POST", headers, body: "x" }), context);
    expect(disabled.status).toBe(503);
    expect(uploadAdminDraftImage).not.toHaveBeenCalled();
  });

  it("rejects foreign origins and invalid gallery keys before the service", async () => {
    const foreign = await POST(new Request("http://localhost:3000/admin/api/drafts/draft-1/media", { method: "POST", headers: { ...headers, Origin: "https://evil.example" }, body: "x" }), context);
    expect(foreign.status).toBe(403);
    const slot = await POST(new Request("http://localhost:3000/admin/api/drafts/draft-1/media", { method: "POST", headers: { ...headers, "X-AyaWarta-Media-Slot": `gallery:${"a".repeat(81)}` }, body: "x" }), context);
    expect(slot.status).toBe(400);
    expect(uploadAdminDraftImage).not.toHaveBeenCalled();
  });

  it("rejects a body above the streamed byte cap", async () => {
    const request = new Request("http://localhost:3000/admin/api/drafts/draft-1/media", {
      method: "POST", headers,
      body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_ADMIN_IMAGE_INPUT_BYTES + 1)); controller.close(); } }),
      duplex: "half",
    } as RequestInit);
    const result = await POST(request, context);
    expect(result.status).toBe(413);
    expect(uploadAdminDraftImage).not.toHaveBeenCalled();
  });

  it("forwards only bounded bytes and server-checked metadata", async () => {
    const result = await POST(new Request("http://localhost:3000/admin/api/drafts/draft-1/media", { method: "POST", headers, body: Buffer.from("image") }), context);
    expect(result.status).toBe(400);
    expect(uploadAdminDraftImage).toHaveBeenCalledWith(expect.objectContaining({
      draftId: "draft-1", expectedDraftVersion: 2, slot: "hero", contentType: "image/jpeg", bytes: Buffer.from("image"),
    }));
  });
});
