import { describe, expect, it } from "vitest";
import {
  getUtf8ByteLength,
  isValidPasswordByteLength,
  loginSchema,
  normalizeEmail,
} from "./schema";

describe("normalizeEmail", () => {
  it("trims whitespace from start and end", () => {
    expect(normalizeEmail("  admin@ayawarta.com  ")).toBe("admin@ayawarta.com");
  });

  it("converts uppercase characters to lowercase", () => {
    expect(normalizeEmail("ADMIN@Ayawarta.COM")).toBe("admin@ayawarta.com");
  });

  it("handles mixed case with tabs and newlines", () => {
    expect(normalizeEmail("\tAdmin@Ayawarta.com\n")).toBe("admin@ayawarta.com");
  });
});

describe("getUtf8ByteLength and isValidPasswordByteLength", () => {
  it("computes exact byte length for ASCII characters", () => {
    expect(getUtf8ByteLength("abc123")).toBe(6);
  });

  it("computes exact byte length for multi-byte Unicode and emoji characters", () => {
    // '€' is 3 bytes in UTF-8
    expect(getUtf8ByteLength("€")).toBe(3);
    // '日' is 3 bytes in UTF-8
    expect(getUtf8ByteLength("日")).toBe(3);
    // '🎉' is 4 bytes in UTF-8
    expect(getUtf8ByteLength("🎉")).toBe(4);
  });

  it("validates byte lengths against BCRYPT_MAX_BYTES (72)", () => {
    expect(isValidPasswordByteLength("")).toBe(false);
    expect(isValidPasswordByteLength("a".repeat(72))).toBe(true);
    expect(isValidPasswordByteLength("a".repeat(73))).toBe(false);
  });
});

describe("loginSchema", () => {
  it("validates and normalizes valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "  SuperAdmin@AyaWarta.com  ",
      password: "secure-password-123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("superadmin@ayawarta.com");
      expect(result.data.password).toBe("secure-password-123");
    }
  });

  it("accepts passwords up to exactly 72 bytes", () => {
    const exactly72Bytes = "x".repeat(72);
    expect(getUtf8ByteLength(exactly72Bytes)).toBe(72);

    const result = loginSchema.safeParse({
      email: "admin@ayawarta.com",
      password: exactly72Bytes,
    });
    expect(result.success).toBe(true);
  });

  it("rejects ASCII passwords exceeding 72 bytes", () => {
    const seventyThreeBytes = "x".repeat(73);
    expect(getUtf8ByteLength(seventyThreeBytes)).toBe(73);

    const result = loginSchema.safeParse({
      email: "admin@ayawarta.com",
      password: seventyThreeBytes,
    });
    expect(result.success).toBe(false);
  });

  it("rejects multi-byte passwords exceeding 72 bytes even if character count <= 72", () => {
    // 25 characters of '日' = 25 * 3 = 75 bytes (> 72 bytes) although char count is only 25
    const multiByteString = "日".repeat(25);
    expect(multiByteString.length).toBe(25);
    expect(getUtf8ByteLength(multiByteString)).toBe(75);

    const result = loginSchema.safeParse({
      email: "admin@ayawarta.com",
      password: multiByteString,
    });
    expect(result.success).toBe(false);
  });

  it("accepts multi-byte passwords within 72 bytes", () => {
    // 24 characters of '日' = 24 * 3 = 72 bytes
    const multiByte72 = "日".repeat(24);
    expect(getUtf8ByteLength(multiByte72)).toBe(72);

    const result = loginSchema.safeParse({
      email: "admin@ayawarta.com",
      password: multiByte72,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email formats", () => {
    const invalidEmails = [
      "",
      "not-an-email",
      "missing-domain@",
      "@missing-user.com",
      "spaces in@domain.com",
    ];

    for (const email of invalidEmails) {
      const result = loginSchema.safeParse({
        email,
        password: "validpassword",
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@ayawarta.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-string types", () => {
    expect(
      loginSchema.safeParse({
        email: 12345,
        password: "password",
      }).success
    ).toBe(false);

    expect(
      loginSchema.safeParse({
        email: "admin@ayawarta.com",
        password: null,
      }).success
    ).toBe(false);
  });
});
