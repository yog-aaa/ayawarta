import { describe, expect, it } from "vitest";
import { verifyAdminCloudImage, type AdminCloudImage } from "./media-cloudinary";

const image: AdminCloudImage = {
  assetId: "cloud-asset-1", publicId: "ayawarta/production/invitations/draft-abc/images/p-sha",
  secureUrl: "https://res.cloudinary.com/uhwi7xvb/image/upload/v123/ayawarta/production/invitations/draft-abc/images/p-sha.webp",
  resourceType: "image", format: "webp", version: 123, bytes: 1000, width: 600, height: 800,
};
const prepared = { format: "webp" as const, bytes: 1000, width: 600, height: 800 };

describe("admin Cloudinary identity", () => {
  it("accepts only the exact target, public ID, version and prepared metadata", () => {
    expect(() => verifyAdminCloudImage(image, prepared, image.publicId, "uhwi7xvb")).not.toThrow();
    for (const modified of [
      { ...image, assetId: "" }, { ...image, bytes: 999 }, { ...image, width: 599 },
      { ...image, version: 124 }, { ...image, publicId: "other" },
      { ...image, secureUrl: image.secureUrl.replace("uhwi7xvb", "other-cloud") },
      { ...image, secureUrl: `${image.secureUrl}?token=bad` },
    ]) expect(() => verifyAdminCloudImage(modified, prepared, image.publicId, "uhwi7xvb")).toThrow();
  });
});
