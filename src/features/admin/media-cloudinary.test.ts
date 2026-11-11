import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealAdminMediaCloudClient, verifyAdminCloudImage, type AdminCloudImage } from "./media-cloudinary";

const resource = vi.hoisted(() => vi.fn());
vi.mock("cloudinary", () => ({ v2: { config: vi.fn(), api: { resource } } }));

const image: AdminCloudImage = {
  assetId: "cloud-asset-1", publicId: "ayawarta/production/invitations/draft-abc/images/p-sha",
  secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v123/ayawarta/production/invitations/draft-abc/images/p-sha.webp",
  resourceType: "image", format: "webp", version: 123, bytes: 1000, width: 600, height: 800,
};
const prepared = { format: "webp" as const, bytes: 1000, width: 600, height: 800 };

describe("admin Cloudinary identity", () => {
  beforeEach(() => resource.mockReset());

  it("accepts only the exact target, public ID, version and prepared metadata", () => {
    expect(() => verifyAdminCloudImage(image, prepared, image.publicId, "uhwi7xvb")).not.toThrow();
    for (const modified of [
      { ...image, assetId: "" }, { ...image, bytes: 999 }, { ...image, width: 599 },
      { ...image, version: 124 }, { ...image, publicId: "other" },
      { ...image, secureUrl: image.secureUrl.replace("uhwi7xvb", "other-cloud") },
      { ...image, secureUrl: `${image.secureUrl}?token=bad` },
    ]) expect(() => verifyAdminCloudImage(modified, prepared, image.publicId, "uhwi7xvb")).toThrow();
  });

  it("treats the SDK's nested 404 response as an absent resource", async () => {
    resource.mockRejectedValueOnce({ error: { message: "Resource not found", http_code: 404 } });
    const client = new RealAdminMediaCloudClient({ cloudName: "uhwi7xvb", apiKey: "test", apiSecret: "test" });
    await expect(client.read(image.publicId)).resolves.toBeNull();
  });

  it("also accepts a top-level 404 but propagates authentication and provider failures", async () => {
    const client = new RealAdminMediaCloudClient({ cloudName: "uhwi7xvb", apiKey: "test", apiSecret: "test" });
    resource.mockRejectedValueOnce({ http_code: 404 });
    await expect(client.read(image.publicId)).resolves.toBeNull();
    for (const code of [401, 500]) {
      const failure = { error: { http_code: code } };
      resource.mockRejectedValueOnce(failure);
      await expect(client.read(image.publicId)).rejects.toBe(failure);
    }
  });
});
