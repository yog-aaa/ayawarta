import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { validateServerEnv } from "./env";

const mockValidEnv: Record<string, string> = {
  DATABASE_URL: "postgresql://postgres:sample_secret_password@localhost:5432/ayawarta",
  AUTH_SECRET: "mock-super-secret-auth-value-never-leak-this",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "SuperSecureAdminPassword123!",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "mock-cloudinary-secret-value-never-print",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "test-cloud",
  NEXT_PUBLIC_FIREBASE_API_KEY: "mock-firebase-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:abcdef",
};

describe("Environment Validation Contract", () => {
  it("validates a complete and valid environment successfully", () => {
    const parsed = validateServerEnv(mockValidEnv);
    expect(parsed.DATABASE_URL).toBe(mockValidEnv.DATABASE_URL);
    expect(parsed.ADMIN_EMAIL).toBe("admin@example.com");
  });

  it("fails with key-name-only error when required variables are missing", () => {
    const invalidEnv = { ...mockValidEnv };
    delete invalidEnv.DATABASE_URL;
    delete invalidEnv.AUTH_SECRET;
    delete invalidEnv.CLOUDINARY_API_SECRET;

    expect(() => validateServerEnv(invalidEnv)).toThrowError(
      /Missing or invalid keys:.*DATABASE_URL.*AUTH_SECRET.*CLOUDINARY_API_SECRET/
    );
  });

  it("never includes sensitive input values in the error message", () => {
    const invalidEnv = {
      ...mockValidEnv,
      ADMIN_EMAIL: "invalid-email-not-an-email",
      ADMIN_PASSWORD: "short", // less than 8 characters
    };

    try {
      validateServerEnv(invalidEnv);
      expect.fail("Expected validateServerEnv to throw");
    } catch (err) {
      const message = (err as Error).message;
      // Key names should be reported
      expect(message).toContain("ADMIN_EMAIL");
      expect(message).toContain("ADMIN_PASSWORD");

      // Sensitive values must NOT appear in the error message
      expect(message).not.toContain("invalid-email-not-an-email");
      expect(message).not.toContain("short");
      expect(message).not.toContain("sample_secret_password");
      expect(message).not.toContain("mock-super-secret-auth-value");
      expect(message).not.toContain("mock-cloudinary-secret-value");
    }
  });

  it("handles optional fields cleanly when omitted", () => {
    const parsed = validateServerEnv(mockValidEnv);
    expect(parsed.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID).toBeUndefined();
    expect(parsed.NEXT_DISABLE_LIGHTNINGCSS).toBeUndefined();

    const withOptional = {
      ...mockValidEnv,
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-ABC123XYZ",
      NEXT_DISABLE_LIGHTNINGCSS: "true",
    };
    const parsedWithOptional = validateServerEnv(withOptional);
    expect(parsedWithOptional.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID).toBe("G-ABC123XYZ");
    expect(parsedWithOptional.NEXT_DISABLE_LIGHTNINGCSS).toBe("true");
  });

  it("scans client-side components to ensure no server-only keys are referenced", () => {
    const serverOnlyKeys = [
      "DATABASE_URL",
      "AUTH_SECRET",
      "ADMIN_PASSWORD",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ];

    const violations: { file: string; key: string }[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const isClientComponent = /['"]use client['"]/.test(content);
          if (isClientComponent) {
            for (const key of serverOnlyKeys) {
              if (content.includes(key)) {
                violations.push({ file: path.relative(process.cwd(), fullPath), key });
              }
            }
          }
        }
      }
    }

    scanDir(path.resolve(process.cwd(), "src"));
    expect(violations).toEqual([]);
  });
});
