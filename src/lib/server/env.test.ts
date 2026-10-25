import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  validateServerEnv,
  selectDatabaseConnectionUrl,
} from "./env";

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
    expect(parsed.DATABASE_URL_POOLED).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID).toBeUndefined();
    expect(parsed.NEXT_DISABLE_LIGHTNINGCSS).toBeUndefined();

    const withOptional = {
      ...mockValidEnv,
      DATABASE_URL_POOLED: "postgresql://user:pass@ep-cool-fog-123-pooler.us-east-2.aws.neon.tech/db?sslmode=require",
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-ABC123XYZ",
      NEXT_DISABLE_LIGHTNINGCSS: "true",
    };
    const parsedWithOptional = validateServerEnv(withOptional);
    expect(parsedWithOptional.DATABASE_URL_POOLED).toBe(
      "postgresql://user:pass@ep-cool-fog-123-pooler.us-east-2.aws.neon.tech/db?sslmode=require"
    );
    expect(parsedWithOptional.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID).toBe("G-ABC123XYZ");
    expect(parsedWithOptional.NEXT_DISABLE_LIGHTNINGCSS).toBe("true");
  });

  it("scans client-side components to ensure no server-only keys are referenced", () => {
    const serverOnlyKeys = [
      "DATABASE_URL",
      "DATABASE_URL_POOLED",
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

  describe("NEO-12 — Runtime Database Connection Selection & Local Target Isolation", () => {
    const localDirectUrl = "postgresql://postgres:localpass@localhost:5432/ayawarta";
    const remoteNeonPooledUrl =
      "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
    const remoteNeonDirectUrl =
      "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";

    it("uses local DATABASE_URL and rejects switching to pooled even if DATABASE_URL_POOLED is loaded (.env.local + .env.production coexistence)", () => {
      const coexistingEnv = {
        DATABASE_URL: localDirectUrl,
        DATABASE_URL_POOLED: remoteNeonPooledUrl,
      };

      const result = selectDatabaseConnectionUrl(coexistingEnv, "runtime", "local");
      expect(result.url).toBe(localDirectUrl);
      expect(result.isPooled).toBe(false);
      expect(result.sourceKey).toBe("DATABASE_URL");

      const devResult = selectDatabaseConnectionUrl(coexistingEnv, "runtime", "development");
      expect(devResult.url).toBe(localDirectUrl);
      expect(devResult.isPooled).toBe(false);
      expect(devResult.sourceKey).toBe("DATABASE_URL");
    });

    it("accepts valid local direct database hosts (localhost, 127.0.0.1, ::1)", () => {
      const hosts = [
        "postgresql://user:pass@localhost:5432/ayawarta",
        "postgresql://user:pass@127.0.0.1:5432/ayawarta",
        "postgresql://user:pass@[::1]:5432/ayawarta",
        "postgresql://user:pass@db.localhost:5432/ayawarta",
      ];

      for (const url of hosts) {
        const result = selectDatabaseConnectionUrl({ DATABASE_URL: url }, "runtime", "local");
        expect(result.url).toBe(url);
        expect(result.isPooled).toBe(false);
        expect(result.sourceKey).toBe("DATABASE_URL");
      }
    });

    it("strictly rejects remote database URLs when deployment environment is local", () => {
      const remoteUrls = [
        remoteNeonDirectUrl,
        remoteNeonPooledUrl,
        "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/ayawarta?sslmode=require",
        "postgresql://user:pass@db.xyz.supabase.co:5432/ayawarta?sslmode=require",
        "postgresql://user:pass@my-rds.us-east-1.rds.amazonaws.com:5432/ayawarta",
      ];

      for (const remoteUrl of remoteUrls) {
        expect(() =>
          selectDatabaseConnectionUrl({ DATABASE_URL: remoteUrl }, "runtime", "local")
        ).toThrow("Disallowed database host for local deployment");

        expect(() =>
          selectDatabaseConnectionUrl({ DATABASE_URL: remoteUrl }, "runtime", "development")
        ).toThrow("Disallowed database host for local deployment");
      }
    });

    it("strictly rejects host and connection target redirection parameters in local mode (NEO-15: Runtime)", () => {
      const redirectUrls = [
        "postgresql://user:pass@localhost:5432/ayawarta?host=remote.example",
        "postgresql://user:pass@localhost:5432/ayawarta?HOST=remote.example",
        "postgresql://user:pass@127.0.0.1:5432/ayawarta?hostaddr=93.184.216.34",
        "postgresql://user:pass@localhost:5432/ayawarta?port=5433",
        "postgresql://user:pass@localhost:5432/ayawarta?dbname=otherdb",
        "postgresql://user:pass@localhost:5432/ayawarta?database=otherdb",
        "postgresql://user:pass@localhost:5432/ayawarta?server=evil.com",
        "postgresql://user:pass@localhost:5432/ayawarta?endpoint=ep-xyz-123",
        "postgresql://user:pass@localhost:5432/ayawarta?target_session_attrs=read-write",
      ];

      for (const url of redirectUrls) {
        expect(() =>
          selectDatabaseConnectionUrl({ DATABASE_URL: url }, "runtime", "local")
        ).toThrow(/Connection target redirection is prohibited/);

        expect(() =>
          selectDatabaseConnectionUrl({ DATABASE_URL: url }, "runtime", "development")
        ).toThrow(/Connection target redirection is prohibited/);
      }
    });

    it("accepts standard benign query parameters in local mode (NEO-15: Runtime)", () => {
      const benignUrl = "postgresql://user:pass@localhost:5432/ayawarta?schema=public&sslmode=disable";
      const result = selectDatabaseConnectionUrl({ DATABASE_URL: benignUrl }, "runtime", "local");
      expect(result.url).toBe(benignUrl);
      expect(result.isPooled).toBe(false);
      expect(result.sourceKey).toBe("DATABASE_URL");
    });

    it("requires DATABASE_URL_POOLED on Vercel Production runtime and fails closed if missing or empty", () => {
      const validProd = {
        DATABASE_URL: remoteNeonDirectUrl,
        DATABASE_URL_POOLED: remoteNeonPooledUrl,
      };

      const result = selectDatabaseConnectionUrl(validProd, "runtime", "production");
      expect(result.url).toBe(remoteNeonPooledUrl);
      expect(result.isPooled).toBe(true);
      expect(result.sourceKey).toBe("DATABASE_URL_POOLED");

      expect(() =>
        selectDatabaseConnectionUrl(
          { DATABASE_URL: remoteNeonDirectUrl, DATABASE_URL_POOLED: undefined },
          "runtime",
          "production"
        )
      ).toThrow("DATABASE_URL_POOLED is required for Vercel Production runtime");

      expect(() =>
        selectDatabaseConnectionUrl(
          { DATABASE_URL: remoteNeonDirectUrl, DATABASE_URL_POOLED: "   " },
          "runtime",
          "production"
        )
      ).toThrow("DATABASE_URL_POOLED is required for Vercel Production runtime");
    });

    it("uses pooled connection on Vercel Preview runtime if available, falling back to direct if omitted", () => {
      const withPooled = selectDatabaseConnectionUrl(
        { DATABASE_URL: remoteNeonDirectUrl, DATABASE_URL_POOLED: remoteNeonPooledUrl },
        "runtime",
        "preview"
      );
      expect(withPooled.url).toBe(remoteNeonPooledUrl);
      expect(withPooled.isPooled).toBe(true);

      const withoutPooled = selectDatabaseConnectionUrl(
        { DATABASE_URL: remoteNeonDirectUrl, DATABASE_URL_POOLED: undefined },
        "runtime",
        "preview"
      );
      expect(withoutPooled.url).toBe(remoteNeonDirectUrl);
      expect(withoutPooled.isPooled).toBe(false);
      expect(withoutPooled.sourceKey).toBe("DATABASE_URL");
    });

    it("selects direct DATABASE_URL for migration mode on production", () => {
      const result = selectDatabaseConnectionUrl(
        { DATABASE_URL: remoteNeonDirectUrl, DATABASE_URL_POOLED: remoteNeonPooledUrl },
        "migration",
        "production"
      );
      expect(result.url).toBe(remoteNeonDirectUrl);
      expect(result.isPooled).toBe(false);
      expect(result.sourceKey).toBe("DATABASE_URL");
    });
  });
});
