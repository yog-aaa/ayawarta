import { describe, expect, it } from "vitest";
import {
  assertPrismaTargetGuard,
  buildPrismaConfig,
} from "./prisma.config";

describe("Prisma Target Guard & Configuration Safety (NEO-15 & NEO-16)", () => {
  const localDirectUrl = "postgresql://postgres:postgres_secret_pass@localhost:5432/ayawarta";
  const validDirectUrl =
    "postgresql://ayawarta_owner:direct_secret_pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
  const validPooledUrl =
    "postgresql://ayawarta_owner:pooled_secret_pass@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
  const approvedFingerprint = "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner";

  describe("NEO-15: Local Target Redirection Rejection on Prisma CLI Path", () => {
    it("accepts standard local PostgreSQL URL in default local mode", () => {
      const result = assertPrismaTargetGuard({ DATABASE_URL: localDirectUrl });
      expect(result.isProduction).toBe(false);
    });

    it("accepts local URL with benign query parameters", () => {
      const benignUrl = `${localDirectUrl}?schema=public&sslmode=disable`;
      const result = assertPrismaTargetGuard({ DATABASE_URL: benignUrl });
      expect(result.isProduction).toBe(false);
    });

    it("strictly rejects ?host=remote.example and case variants on Prisma CLI path", () => {
      const badUrls = [
        "postgresql://postgres:pass@localhost:5432/ayawarta?host=remote.example",
        "postgresql://postgres:pass@localhost:5432/ayawarta?HOST=remote.example",
        "postgresql://postgres:pass@localhost:5432/ayawarta?Host=remote.example",
      ];

      for (const url of badUrls) {
        expect(() =>
          assertPrismaTargetGuard({ DATABASE_URL: url })
        ).toThrow(/Connection target redirection is prohibited/);
      }
    });

    it("strictly rejects alternate target redirection parameters on Prisma CLI path", () => {
      const redirectUrls = [
        "postgresql://postgres:pass@127.0.0.1:5432/ayawarta?hostaddr=93.184.216.34",
        "postgresql://postgres:pass@localhost:5432/ayawarta?port=5433",
        "postgresql://postgres:pass@localhost:5432/ayawarta?dbname=otherdb",
        "postgresql://postgres:pass@localhost:5432/ayawarta?database=otherdb",
        "postgresql://postgres:pass@localhost:5432/ayawarta?server=evil.com",
        "postgresql://postgres:pass@localhost:5432/ayawarta?endpoint=ep-xyz-123",
        "postgresql://postgres:pass@localhost:5432/ayawarta?target_session_attrs=read-write",
      ];

      for (const url of redirectUrls) {
        expect(() =>
          assertPrismaTargetGuard({ DATABASE_URL: url })
        ).toThrow(/Connection target redirection is prohibited/);
      }
    });

    it("strictly rejects direct remote database URLs in default local mode", () => {
      const remoteUrls = [
        validDirectUrl,
        "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/ayawarta?sslmode=require",
        "postgresql://user:pass@db.xyz.supabase.co:5432/ayawarta?sslmode=require",
      ];

      for (const url of remoteUrls) {
        expect(() =>
          assertPrismaTargetGuard({ DATABASE_URL: url })
        ).toThrow("Disallowed database host for local deployment");
      }
    });

    it("rejects forged old preflight markers in default configuration", () => {
      expect(() =>
        assertPrismaTargetGuard({
          DATABASE_URL: localDirectUrl,
          AYAWARTA_TARGET_ENV: "production",
        })
      ).toThrow(/Direct Prisma CLI execution with production environment markers is prohibited/);

      expect(() =>
        assertPrismaTargetGuard({
          DATABASE_URL: localDirectUrl,
          AYAWARTA_PRODUCTION_PREFLIGHT_PASSED: "1",
        })
      ).toThrow(/Direct Prisma CLI execution with production environment markers is prohibited/);
    });
  });

  describe("NEO-16: Production Effective Configuration & Datasource Consistency", () => {
    const validFileEnv: Record<string, string> = {
      DATABASE_URL: validDirectUrl,
      DATABASE_URL_POOLED: validPooledUrl,
      APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
    };

    it("accepts matching shell and file production URLs and approves target", () => {
      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
      };

      const result = assertPrismaTargetGuard(shellEnv, {
        explicitFileEnv: validFileEnv,
      });

      expect(result.isProduction).toBe(true);
      expect(result.effectiveDirectUrl).toBe(validDirectUrl);
      expect(result.sanitizedTarget?.targetApprovalStatus).toBe("verified");
      expect(result.sanitizedTarget?.database).toBe("ayawarta_prod");
      expect(result.sanitizedTarget?.region).toBe("us-east-2.aws");
    });

    it("proves validated direct URL is identical to datasource.url in buildPrismaConfig()", () => {
      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
      };

      const guardResult = assertPrismaTargetGuard(shellEnv, {
        explicitFileEnv: validFileEnv,
      });

      const prismaConfig = buildPrismaConfig(guardResult);

      // The exact validated direct URL MUST be passed to datasource.url without alteration
      expect(prismaConfig.datasource?.url).toBe(guardResult.effectiveDirectUrl);
      expect(prismaConfig.datasource?.url).toBe(validDirectUrl);
    });

    it("fails closed without leaking credentials when shell and file DATABASE_URL conflict", () => {
      const conflictingDirectUrl =
        "postgresql://ayawarta_owner:different_pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";

      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: conflictingDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
      };

      expect(() =>
        assertPrismaTargetGuard(shellEnv, {
          explicitFileEnv: validFileEnv,
        })
      ).toThrow("Conflicting DATABASE_URL detected: shell environment and .env.production specify different database connection URLs.");

      try {
        assertPrismaTargetGuard(shellEnv, { explicitFileEnv: validFileEnv });
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).not.toContain("direct_secret_pass");
        expect(msg).not.toContain("different_pass");
      }
    });

    it("fails closed when shell and file DATABASE_URL_POOLED conflict", () => {
      const conflictingPooledUrl =
        "postgresql://ayawarta_owner:different_pass@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";

      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: conflictingPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
      };

      expect(() =>
        assertPrismaTargetGuard(shellEnv, {
          explicitFileEnv: validFileEnv,
        })
      ).toThrow("Conflicting DATABASE_URL_POOLED detected: shell environment and .env.production specify different database connection URLs.");
    });

    it("fails closed when shell and file APPROVED_NEON_TARGET_FINGERPRINT conflict", () => {
      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: "ep-other-endpoint:ayawarta_prod:ayawarta_owner",
      };

      expect(() =>
        assertPrismaTargetGuard(shellEnv, {
          explicitFileEnv: validFileEnv,
        })
      ).toThrow("Conflicting APPROVED_NEON_TARGET_FINGERPRINT detected: shell environment and .env.production specify different target fingerprints.");
    });

    it("fails closed when .env.production file is missing on disk", () => {
      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: approvedFingerprint,
      };

      expect(() =>
        assertPrismaTargetGuard(shellEnv, {
          envPath: "C:/non/existent/path/.env.production",
        })
      ).toThrow("Production Prisma configuration requires valid .env.production file. File not found.");
    });

    it("fails closed when approved target fingerprint is wrong or unapproved", () => {
      const wrongFingerprint = "ep-cool-fog-123456:wrong_database:ayawarta_owner";

      const fileWithWrongFingerprint = {
        ...validFileEnv,
        APPROVED_NEON_TARGET_FINGERPRINT: wrongFingerprint,
      };

      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        DATABASE_URL: validDirectUrl,
        DATABASE_URL_POOLED: validPooledUrl,
        APPROVED_NEON_TARGET_FINGERPRINT: wrongFingerprint,
      };

      expect(() =>
        assertPrismaTargetGuard(shellEnv, {
          explicitFileEnv: fileWithWrongFingerprint,
        })
      ).toThrow(/Target mismatch: Neon database does not match/);
    });

    it("allows omitting shell variables when valid .env.production file provides them without conflict", () => {
      const shellEnv: Record<string, string> = {
        AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
      };

      const result = assertPrismaTargetGuard(shellEnv, {
        explicitFileEnv: validFileEnv,
      });

      expect(result.isProduction).toBe(true);
      expect(result.effectiveDirectUrl).toBe(validDirectUrl);
    });
  });
});
