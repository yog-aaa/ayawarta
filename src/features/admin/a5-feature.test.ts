import { describe, expect, it } from "vitest";
import { isA5Enabled, requireA5Enabled } from "./a5-feature";

describe("A5 activation gate", () => {
  const approved = { AYAWARTA_A5_MEDIA: "enabled", AYAWARTA_A5_APPROVED_CLOUD: "uhwi7xvb", NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "uhwi7xvb" };
  it("fails closed until enabled and exactly bound to the approved Cloudinary target", () => {
    expect(isA5Enabled({})).toBe(false);
    expect(isA5Enabled({ ...approved, AYAWARTA_A5_MEDIA: undefined })).toBe(false);
    expect(isA5Enabled({ ...approved, AYAWARTA_A5_APPROVED_CLOUD: "other" })).toBe(false);
    expect(isA5Enabled({ ...approved, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "other" })).toBe(false);
    expect(isA5Enabled(approved)).toBe(true);
    expect(() => requireA5Enabled({})).toThrow("belum diaktifkan");
  });
});
