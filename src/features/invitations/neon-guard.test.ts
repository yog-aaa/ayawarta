import { describe, expect, it, vi } from "vitest";
import {
  validateNeonDatabaseTargets,
  assertNeonDatabaseTargets,
  NeonTargetGuardError,
} from "./neon-guard";
import {
  selectDatabaseConnectionUrl,
  resolveDeploymentEnvironment,
} from "@/lib/server/env";
import {
  loadProductionConfig,
} from "./production-env";
import { runProductionMigration } from "../../../scripts/production/migrate";
import { runProductionSeed } from "../../../scripts/production/seed";
import {
  runProductionVerification,
  inspectProductionDatabaseState,
  type DatabaseMetadataClient,
} from "../../../scripts/production/verify";
import { assertPrismaTargetGuard } from "../../../prisma.config";
import {
  verifyCanonicalMediaAssets,
  type MediaAssetRecord,
} from "../../../scripts/production/verify";
import type { PrismaClient } from "@/generated/prisma/client";
import { EXPECTED_SEED_COUNTS } from "./seed-constants";
import { executeSeed, SeedExecutionError } from "./seed";
import { CANONICAL_PRODUCTION_MEDIA } from "@/features/media/canonical-catalog";

describe("Neon Production Database Target Guard & Connection Selection", () => {
  const validDirect =
    "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
  const validPooled =
    "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";

  describe("validateNeonDatabaseTargets (Positive validation)", () => {
    it("validates direct and pooled Neon URLs pointing to the same endpoint and database", () => {
      const result = validateNeonDatabaseTargets({
        directUrl: validDirect,
        pooledUrl: validPooled,
      });

      expect(result.protocol).toBe("postgresql:");
      expect(result.database).toBe("ayawarta_prod");
      expect(result.region).toBe("us-east-2.aws");
      expect(result.endpointPrefixMasked).toBe("ep-***");
      expect(result.directHostMasked).toBe("ep-***.us-east-2.aws.neon.tech");
      expect(result.pooledHostMasked).toBe("ep-***-pooler.us-east-2.aws.neon.tech");
      expect(result.tlsEnforced).toBe(true);
      expect(result.targetApprovalStatus).toBe("UNPROVEN");
    });

    it("accepts postgres: scheme alias", () => {
      const direct = validDirect.replace("postgresql:", "postgres:");
      const pooled = validPooled.replace("postgresql:", "postgres:");
      const result = validateNeonDatabaseTargets({
        directUrl: direct,
        pooledUrl: pooled,
      });
      expect(result.protocol).toBe("postgres:");
    });
  });

  describe("validateNeonDatabaseTargets (Negative fail-closed checks)", () => {
    it("rejects when directUrl is empty or missing", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: "",
          pooledUrl: validPooled,
        })
      ).toThrow(NeonTargetGuardError);
    });

    it("rejects when pooledUrl is empty or missing", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: "   ",
        })
      ).toThrow(NeonTargetGuardError);
    });

    it("rejects malformed URLs", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: "not-a-valid-url",
          pooledUrl: validPooled,
        })
      ).toThrow("malformed and could not be parsed");
    });

    it("rejects disallowed protocols (e.g. mysql: or http:)", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: "mysql://user:pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/db?sslmode=require",
          pooledUrl: validPooled,
        })
      ).toThrow("Disallowed protocol");
    });

    it("strictly rejects localhost, 127.0.0.1, and ::1", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: "postgresql://user:pass@localhost:5432/ayawarta?sslmode=require",
          pooledUrl: validPooled,
        })
      ).toThrow("localhost is rejected");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: "postgresql://user:pass@127.0.0.1:5432/ayawarta?sslmode=require",
        })
      ).toThrow("localhost is rejected");
    });

    it("rejects non-Neon hosts (e.g. Aiven, AWS RDS, Supabase)", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/db?sslmode=require",
          pooledUrl: validPooled,
        })
      ).toThrow("does not belong to authorized Neon domain (*.neon.tech)");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: "postgresql://user:pass@db.xyz.supabase.co:5432/db?sslmode=require",
        })
      ).toThrow("does not belong to authorized Neon domain (*.neon.tech)");
    });

    it("rejects when direct URL incorrectly contains a -pooler suffix", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validPooled,
          pooledUrl: validPooled,
        })
      ).toThrow("direct DATABASE_URL must point to the direct endpoint, not a -pooler endpoint");
    });

    it("rejects when pooled URL lacks the -pooler suffix", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validDirect,
        })
      ).toThrow("pooled DATABASE_URL_POOLED must point to a -pooler endpoint");
    });

    it("rejects mismatched Neon project endpoint IDs", () => {
      const differentEndpointPooled =
        "postgresql://ayawarta_owner:SecretPass123@ep-other-id-999999-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: differentEndpointPooled,
        })
      ).toThrow("different Neon projects or endpoint IDs");
    });

    it("rejects mismatched regions", () => {
      const differentRegionPooled =
        "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456-pooler.eu-central-1.aws.neon.tech/ayawarta_prod?sslmode=require";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: differentRegionPooled,
        })
      ).toThrow("different Neon regions or cloud providers");
    });

    it("rejects mismatched database names", () => {
      const differentDbPooled =
        "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/other_db?sslmode=require";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: differentDbPooled,
        })
      ).toThrow("target different databases");
    });

    it("rejects mismatched database usernames/roles", () => {
      const differentUserPooled =
        "postgresql://other_user:SecretPass123@ep-cool-fog-123456-pooler.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: differentUserPooled,
        })
      ).toThrow("different database roles");
    });
  });

  describe("NEO-05 — TLS Enforcement & Target Identity Binding", () => {
    it("rejects connection string without sslmode parameter", () => {
      const directNoSsl = "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: directNoSsl,
          pooledUrl: validPooled,
        })
      ).toThrow("Missing or disallowed sslmode");
    });

    it("rejects insecure sslmode (e.g. sslmode=disable or sslmode=allow)", () => {
      const directInsecureSsl =
        "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=disable";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: directInsecureSsl,
          pooledUrl: validPooled,
        })
      ).toThrow("Missing or disallowed sslmode");
    });

    it("rejects ssl=false downgrade parameter", () => {
      const directDowngrade =
        "postgresql://ayawarta_owner:SecretPass123@ep-cool-fog-123456.us-east-2.aws.neon.tech/ayawarta_prod?sslmode=require&ssl=false";
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: directDowngrade,
          pooledUrl: validPooled,
        })
      ).toThrow("Disallowed query parameter in direct DATABASE_URL");
    });

    it("rejects connection target override parameters on both URLs", () => {
      const overrides = [
        "host=evil.example",
        "HOST=evil.example",
        "hostaddr=127.0.0.1",
        "user=other_role",
        "password=other_password",
        "port=9999",
        "dbname=other_db",
        "options=-c%20search_path%3Dother",
        "target_session_attrs=read-write",
        "sslrootcert=other.pem",
      ];

      for (const override of overrides) {
        expect(() =>
          validateNeonDatabaseTargets({
            directUrl: `${validDirect}&${override}`,
            pooledUrl: validPooled,
            approvedTarget: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
            requireApprovedTarget: true,
          })
        ).toThrow("Disallowed query parameter in direct DATABASE_URL");

        expect(() =>
          validateNeonDatabaseTargets({
            directUrl: validDirect,
            pooledUrl: `${validPooled}&${override}`,
            approvedTarget: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
            requireApprovedTarget: true,
          })
        ).toThrow("Disallowed query parameter in pooled DATABASE_URL_POOLED");
      }
    });

    it("rejects duplicate sslmode before the driver can apply a later TLS downgrade", () => {
      for (const [directUrl, pooledUrl] of [
        [`${validDirect}&sslmode=disable`, validPooled],
        [validDirect, `${validPooled}&sslmode=disable`],
      ]) {
        expect(() =>
          validateNeonDatabaseTargets({
            directUrl,
            pooledUrl,
            approvedTarget: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
            requireApprovedTarget: true,
          })
        ).toThrow("Duplicate 'sslmode' query parameter");
      }
    });

    it("accepts the production query contract and rejects duplicate or weakened options", () => {
      const approvedTarget = "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner";
      expect(
        validateNeonDatabaseTargets({
          directUrl: `${validDirect}&channel_binding=require&schema=public`,
          pooledUrl: `${validPooled}&channel_binding=require&schema=public`,
          approvedTarget,
          requireApprovedTarget: true,
        }).targetApprovalStatus
      ).toBe("verified");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: `${validDirect}&channel_binding=require&channel_binding=require`,
          pooledUrl: validPooled,
        })
      ).toThrow("Duplicate 'channel_binding' query parameter");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: `${validDirect}&channel_binding=disable`,
          pooledUrl: validPooled,
        })
      ).toThrow("must require channel binding");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: `${validPooled}&schema=other`,
        })
      ).toThrow("may only target the public schema");
    });

    it("rejects explicit nonstandard ports in either URL", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect.replace(".neon.tech/", ".neon.tech:9999/"),
          pooledUrl: validPooled,
        })
      ).toThrow("may only use PostgreSQL port 5432");

      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled.replace(".neon.tech/", ".neon.tech:9999/"),
        })
      ).toThrow("may only use PostgreSQL port 5432");
    });

    it("verifies approved target identity when matching approvedTarget tuple is supplied", () => {
      const result = validateNeonDatabaseTargets({
        directUrl: validDirect,
        pooledUrl: validPooled,
        approvedTarget: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
      });
      expect(result.targetApprovalStatus).toBe("verified");
      expect(result.approvedTargetFingerprintMasked).toBe("ep-***/ayawarta_prod/ayawarta_owner");
    });

    it("verifies approved target identity when structured ApprovedTargetIdentity object is supplied", () => {
      const result = validateNeonDatabaseTargets({
        directUrl: validDirect,
        pooledUrl: validPooled,
        approvedTarget: {
          endpoint: "ep-cool-fog-123456",
          database: "ayawarta_prod",
          role: "ayawarta_owner",
        },
      });
      expect(result.targetApprovalStatus).toBe("verified");
      expect(result.approvedTargetFingerprintMasked).toBe("ep-***/ayawarta_prod/ayawarta_owner");
    });

    it("rejects when endpoint in approved target tuple does not match (mutation test)", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled,
          approvedTarget: "ep-wrong-endpoint:ayawarta_prod:ayawarta_owner",
        })
      ).toThrow("Target mismatch: Neon endpoint does not match the approved production target identity.");
    });

    it("rejects when database in approved target tuple does not match (mutation test)", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled,
          approvedTarget: "ep-cool-fog-123456:wrong_db:ayawarta_owner",
        })
      ).toThrow("Target mismatch: Neon database does not match the approved production target identity.");
    });

    it("rejects when role in approved target tuple does not match (mutation test)", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled,
          approvedTarget: "ep-cool-fog-123456:ayawarta_prod:wrong_role",
        })
      ).toThrow("Target mismatch: Neon role does not match the approved production target identity.");
    });

    it("treats incomplete tuple (only endpoint without database and role) as unproven and fails closed when required", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled,
          approvedTarget: "ep-cool-fog-123456",
          requireApprovedTarget: true,
        })
      ).toThrow("Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)");
    });

    it("reports targetApprovalStatus as UNPROVEN when approval identity is not configured without requireApprovedTarget", () => {
      const result = validateNeonDatabaseTargets({
        directUrl: validDirect,
        pooledUrl: validPooled,
      });
      expect(result.targetApprovalStatus).toBe("UNPROVEN");
    });

    it("fails closed when requireApprovedTarget is true but approvedTarget is omitted", () => {
      expect(() =>
        validateNeonDatabaseTargets({
          directUrl: validDirect,
          pooledUrl: validPooled,
          requireApprovedTarget: true,
        })
      ).toThrow("Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)");
    });
  });

  describe("Sanitization & Secret Protection", () => {
    it("never reflects raw password, username, or unmasked endpoint ID in error messages", () => {
      try {
        validateNeonDatabaseTargets({
          directUrl: "postgresql://my_secret_user:MySuperSecretP@ssword999@evil-host.com/db?sslmode=require",
          pooledUrl: validPooled,
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NeonTargetGuardError);
        const msg = (err as Error).message;
        expect(msg).not.toContain("my_secret_user");
        expect(msg).not.toContain("MySuperSecretP@ssword999");
        expect(msg).not.toContain("evil-host.com");
      }
    });

    it("assertNeonDatabaseTargets logs only sanitized components and hides credentials", () => {
      const logSpy = vi.fn();
      const target = assertNeonDatabaseTargets(
        {
          directUrl: validDirect,
          pooledUrl: validPooled,
          approvedTarget: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
        },
        { log: logSpy }
      );

      expect(logSpy).toHaveBeenCalledTimes(1);
      const logged = logSpy.mock.calls[0][0];
      expect(logged).toContain("[Neon Guard] Target verified");
      expect(logged).toContain("ep-***");
      expect(logged).not.toContain("SecretPass123");
      expect(logged).not.toContain("ayawarta_owner");
      expect(logged).not.toContain("ep-cool-fog-123456");
      expect(target.database).toBe("ayawarta_prod");
      expect(target.targetApprovalStatus).toBe("verified");
    });
  });

  describe("NEO-04 — Connection Selection on Vercel & Local", () => {
    const config = {
      DATABASE_URL: validDirect,
      DATABASE_URL_POOLED: validPooled,
    };

    it("selects DATABASE_URL_POOLED for Vercel Production runtime", () => {
      const result = selectDatabaseConnectionUrl(config, "runtime", "production");
      expect(result.isPooled).toBe(true);
      expect(result.sourceKey).toBe("DATABASE_URL_POOLED");
      expect(result.url).toBe(validPooled);
    });

    it("STRICTLY THROWS on Vercel Production runtime if DATABASE_URL_POOLED is missing or empty (never falls back to direct)", () => {
      const invalidConfig = {
        DATABASE_URL: validDirect,
        DATABASE_URL_POOLED: undefined,
      };
      expect(() => selectDatabaseConnectionUrl(invalidConfig, "runtime", "production")).toThrow(
        "DATABASE_URL_POOLED is required for Vercel Production runtime. Falling back to direct connection is prohibited"
      );

      const emptyConfig = {
        DATABASE_URL: validDirect,
        DATABASE_URL_POOLED: "   ",
      };
      expect(() => selectDatabaseConnectionUrl(emptyConfig, "runtime", "production")).toThrow(
        "DATABASE_URL_POOLED is required for Vercel Production runtime"
      );
    });

    it("selects direct DATABASE_URL for migration mode even in production", () => {
      const result = selectDatabaseConnectionUrl(config, "migration", "production");
      expect(result.isPooled).toBe(false);
      expect(result.sourceKey).toBe("DATABASE_URL");
      expect(result.url).toBe(validDirect);
    });

    it("supports Vercel Preview runtime with pooled connection if available or direct as fallback", () => {
      const withPooled = selectDatabaseConnectionUrl(config, "runtime", "preview");
      expect(withPooled.isPooled).toBe(true);

      const withoutPooled = selectDatabaseConnectionUrl(
        { DATABASE_URL: validDirect, DATABASE_URL_POOLED: undefined },
        "runtime",
        "preview"
      );
      expect(withoutPooled.isPooled).toBe(false);
      expect(withoutPooled.sourceKey).toBe("DATABASE_URL");
    });

    it("supports Local/Development runtime with direct DATABASE_URL by default", () => {
      const localConfig = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ayawarta",
        DATABASE_URL_POOLED: undefined,
      };
      const result = selectDatabaseConnectionUrl(localConfig, "runtime", "local");
      expect(result.isPooled).toBe(false);
      expect(result.sourceKey).toBe("DATABASE_URL");
      expect(result.url).toBe(localConfig.DATABASE_URL);
    });

    it("resolveDeploymentEnvironment checks explicit VERCEL_ENV and AYAWARTA_DEPLOYMENT_TARGET", () => {
      const originalVercelEnv = process.env.VERCEL_ENV;
      const mutableEnv = process.env as Record<string, string | undefined>;
      try {
        mutableEnv.VERCEL_ENV = "production";
        expect(resolveDeploymentEnvironment()).toBe("production");

        mutableEnv.VERCEL_ENV = "preview";
        expect(resolveDeploymentEnvironment()).toBe("preview");

        delete mutableEnv.VERCEL_ENV;
        mutableEnv.AYAWARTA_DEPLOYMENT_TARGET = "production";
        expect(resolveDeploymentEnvironment()).toBe("production");

        delete mutableEnv.AYAWARTA_DEPLOYMENT_TARGET;
        expect(resolveDeploymentEnvironment()).toBe("local");
      } finally {
        mutableEnv.VERCEL_ENV = originalVercelEnv;
      }
    });
  });

  describe("NEO-01 — inspectProductionDatabaseState (Hermetic Metadata Inspection)", () => {
    it("detects uninitialized database (0 tables in public schema) ready for initial migration", async () => {
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue([]),
      };

      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("uninitialized");
      expect(result.isEmptyForMigration).toBe(true);
      expect(result.isEmptyForSeed).toBe(false);
      expect(result.isSchemaCreated).toBe(false);
      expect(result.existingTables).toEqual([]);
      expect(result.message).toContain("uninitialized");
    });

    it("detects application schema exists but tables are empty (0 rows across tables) ready for seed", async () => {
      const mockTables = [
        { tablename: "User" },
        { tablename: "MediaAsset" },
        { tablename: "Invitation" },
        { tablename: "InvitationSections" },
        { tablename: "Partner" },
        { tablename: "Event" },
        { tablename: "GalleryItem" },
        { tablename: "LoveStory" },
        { tablename: "GiftAccount" },
        { tablename: "_prisma_migrations" },
      ];

      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue(mockTables),
        user: { count: vi.fn().mockResolvedValue(0) },
        mediaAsset: { count: vi.fn().mockResolvedValue(0) },
        invitation: { count: vi.fn().mockResolvedValue(0) },
        invitationSections: { count: vi.fn().mockResolvedValue(0) },
        partner: { count: vi.fn().mockResolvedValue(0) },
        event: { count: vi.fn().mockResolvedValue(0) },
        galleryItem: { count: vi.fn().mockResolvedValue(0) },
        loveStory: { count: vi.fn().mockResolvedValue(0) },
        giftAccount: { count: vi.fn().mockResolvedValue(0) },
      };

      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("tables_exist_empty");
      expect(result.isEmptyForMigration).toBe(false);
      expect(result.isEmptyForSeed).toBe(true);
      expect(result.isSchemaCreated).toBe(true);
      expect(result.message).toContain("empty (0 rows across application tables)");
    });

    it("detects database contains existing application data (non-empty)", async () => {
      const mockTables = [{ tablename: "User" }, { tablename: "Invitation" }];
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue(mockTables),
        user: { count: vi.fn().mockResolvedValue(1) },
        mediaAsset: { count: vi.fn().mockResolvedValue(31) },
        invitation: { count: vi.fn().mockResolvedValue(4) },
        invitationSections: { count: vi.fn().mockResolvedValue(4) },
        partner: { count: vi.fn().mockResolvedValue(8) },
        event: { count: vi.fn().mockResolvedValue(6) },
        galleryItem: { count: vi.fn().mockResolvedValue(21) },
        loveStory: { count: vi.fn().mockResolvedValue(6) },
        giftAccount: { count: vi.fn().mockResolvedValue(5) },
      };

      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("has_data");
      expect(result.isEmptyForMigration).toBe(false);
      expect(result.isEmptyForSeed).toBe(false);
      expect(result.isSchemaCreated).toBe(true);
      expect(result.message).toContain("Database contains application data");
    });

    it("counts admin tables when checking whether a migrated schema is empty", async () => {
      const tables = [
        "User", "MediaAsset", "Invitation", "InvitationSections", "Partner",
        "Event", "GalleryItem", "LoveStory", "GiftAccount",
        "InvitationDraft", "InvitationPublication", "InvitationPublicationMedia",
        "_prisma_migrations",
      ];
      const zero = { count: vi.fn().mockResolvedValue(0) };
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue(tables.map((tablename) => ({ tablename }))),
        user: zero, mediaAsset: zero, invitation: zero, invitationSections: zero,
        partner: zero, event: zero, galleryItem: zero, loveStory: zero,
        giftAccount: zero, invitationDraft: zero,
        invitationPublication: { count: vi.fn().mockResolvedValue(1) },
        invitationPublicationMedia: zero,
      };
      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("has_data");
      expect(result.tableCounts?.invitationPublication).toBe(1);
    });

    it("recognizes and counts the A5 draft-media table without treating it as foreign", async () => {
      const tables = ["User", "MediaAsset", "Invitation", "InvitationSections", "Partner",
        "Event", "GalleryItem", "LoveStory", "GiftAccount", "DraftMediaProvision", "_prisma_migrations"];
      const zero = { count: vi.fn().mockResolvedValue(0) };
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue(tables.map((tablename) => ({ tablename }))),
        user: zero, mediaAsset: zero, invitation: zero, invitationSections: zero,
        partner: zero, event: zero, galleryItem: zero, loveStory: zero, giftAccount: zero,
        draftMediaProvision: { count: vi.fn().mockResolvedValue(2) },
      };
      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("has_data");
      expect(result.tableCounts?.draftMediaProvision).toBe(2);
    });

    it("detects foreign / unexpected tables in public schema", async () => {
      const mockTables = [{ tablename: "some_foreign_table" }, { tablename: "another_app" }];
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockResolvedValue(mockTables),
      };

      const result = await inspectProductionDatabaseState(mockClient);
      expect(result.state).toBe("unexpected_tables");
      expect(result.isEmptyForMigration).toBe(false);
      expect(result.message).toContain("unexpected non-AyaWarta tables");
    });

    it("fails closed on database query failure and NEVER treats query errors as proof of empty", async () => {
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockRejectedValue(new Error("connection terminated unexpectedly")),
      };

      await expect(inspectProductionDatabaseState(mockClient)).rejects.toThrow(
        "connection terminated unexpectedly"
      );
    });
  });

  describe("NEO-02 — Explicit Admin Credentials on Seed", () => {
    it("passes explicit credentials to seed and ignores conflicting local shell process.env", async () => {
      const originalEmail = process.env.ADMIN_EMAIL;
      const originalPassword = process.env.ADMIN_PASSWORD;
      const mutableEnv = process.env as Record<string, string | undefined>;

      try {
        mutableEnv.ADMIN_EMAIL = "attacker@local-shell.com";
        mutableEnv.ADMIN_PASSWORD = "LocalShellWrongPassword!";

        const mockTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          mediaAsset: {
            upsert: vi.fn().mockResolvedValue({ id: "media-1", publicId: "ayawarta/test" }),
            findMany: vi.fn().mockResolvedValue(
              CANONICAL_PRODUCTION_MEDIA.map((m, i) => ({
                id: `media-${i}`,
                publicId: m.publicId,
                secureUrl: m.secureUrl,
              }))
            ),
          },
          invitation: {
            findMany: vi.fn().mockResolvedValue([]),
            upsert: vi.fn().mockImplementation((args) =>
              Promise.resolve({ id: `inv-${args.where.slug}`, ...args.create })
            ),
          },
          invitationPublication: { count: vi.fn().mockResolvedValue(0) },
          invitationSections: { upsert: vi.fn().mockResolvedValue({}) },
          partner: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          event: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          galleryItem: {
            deleteMany: vi.fn().mockResolvedValue({ count: 6 }),
            createMany: vi.fn().mockResolvedValue({ count: 6 }),
          },
          loveStory: {
            deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
          },
          giftAccount: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((args) => Promise.resolve({ ...args.data, id: "admin-1" })),
            upsert: vi.fn().mockImplementation((args) => Promise.resolve({ ...args.create, id: "admin-1" })),
          },
        };

        const mockDb = {
          $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
          user: { count: vi.fn().mockResolvedValue(1) },
          mediaAsset: { count: vi.fn().mockResolvedValue(31) },
          invitation: { count: vi.fn().mockResolvedValue(4) },
          invitationSections: { count: vi.fn().mockResolvedValue(4) },
          partner: { count: vi.fn().mockResolvedValue(8) },
          event: { count: vi.fn().mockResolvedValue(6) },
          galleryItem: { count: vi.fn().mockResolvedValue(21) },
          loveStory: { count: vi.fn().mockResolvedValue(6) },
          giftAccount: { count: vi.fn().mockResolvedValue(5) },
        } as unknown as Parameters<typeof executeSeed>[1];

        const explicitAdmin = {
          email: "production-admin@ayawarta.com",
          password: "SuperProductionPassword123!",
        };

        const res = await executeSeed(
          {
            canonicalMedia: CANONICAL_PRODUCTION_MEDIA,
            bootstrapAdmin: true,
            requireAdminBootstrap: true,
            adminCredentials: explicitAdmin,
          },
          mockDb
        );

        expect(res.adminBootstrapped).toBe(true);
        expect(res.adminOutcome).toBe("created");
        // User upserted was the explicit admin, NOT the local shell attacker
        expect(mockTx.user.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              email: "production-admin@ayawarta.com",
            },
          })
        );
        // process.env remained unmutated
        expect(process.env.ADMIN_EMAIL).toBe("attacker@local-shell.com");
      } finally {
        mutableEnv.ADMIN_EMAIL = originalEmail;
        mutableEnv.ADMIN_PASSWORD = originalPassword;
      }
    });

    it("fails closed before database transaction if requireAdminBootstrap is true but credentials are missing", async () => {
      const mockDb = {
        $transaction: vi.fn(),
      } as unknown as Parameters<typeof executeSeed>[1];

      await expect(
        executeSeed(
          {
            canonicalMedia: CANONICAL_PRODUCTION_MEDIA,
            bootstrapAdmin: true,
            requireAdminBootstrap: true,
            adminCredentials: undefined,
          },
          mockDb
        )
      ).rejects.toThrow(SeedExecutionError);

      expect(mockDb!.$transaction).not.toHaveBeenCalled();
    });
  });

  describe("NEO-03 — Verifier Module Isolation", () => {
    it("exports pure constants without loading .env.local or touching process.env", () => {
      expect(EXPECTED_SEED_COUNTS.user).toBe(1);
      expect(EXPECTED_SEED_COUNTS.mediaAsset).toBe(31);
      expect(EXPECTED_SEED_COUNTS.invitation).toBe(4);
      expect(Object.values(EXPECTED_SEED_COUNTS).reduce((a, b) => a + b, 0)).toBe(86);
    });
  });

  describe("NEO-06 — Production CLIs Error Sanitization", () => {
    it("runProductionMigration sanitizes error output and never leaks credentials in error message", async () => {
      const errWithCredentials = new Error(
        "Failed connection: postgresql://admin_user:secret_prod_pw_999@ep-secret.aws.neon.tech/ayawarta"
      );

      const failingRunner = vi.fn().mockImplementation(() => {
        throw errWithCredentials;
      });

      const validConfig = loadProductionConfig({
        explicitEnv: {
          DATABASE_URL: validDirect,
          DATABASE_URL_POOLED: validPooled,
          AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
          ADMIN_EMAIL: "admin@ayawarta.com",
          ADMIN_PASSWORD: "Password123!",
          APPROVED_NEON_TARGET_FINGERPRINT: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
        },
        ignoreProcessEnvConflicts: true,
      });

      try {
        await runProductionMigration({
          execute: true,
          config: validConfig,
          runner: failingRunner,
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain("[Prod Migration] Execution failed safely. Raw errors suppressed.");
        expect(msg).not.toContain("secret_prod_pw_999");
        expect(msg).not.toContain("admin_user");
        expect(msg).not.toContain("postgresql://");
      }
    });

    it("runProductionSeed sanitizes error output and never leaks connection strings", async () => {
      const failingClient = {
        $transaction: vi.fn().mockRejectedValue(
          new Error("FATAL: password authentication failed for user 'secret_user': secret_pw_456")
        ),
        $disconnect: vi.fn().mockResolvedValue(undefined),
      } as unknown as PrismaClient;

      const validConfig = loadProductionConfig({
        explicitEnv: {
          DATABASE_URL: validDirect,
          DATABASE_URL_POOLED: validPooled,
          AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
          ADMIN_EMAIL: "admin@ayawarta.com",
          ADMIN_PASSWORD: "Password123!",
          APPROVED_NEON_TARGET_FINGERPRINT: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
        },
        ignoreProcessEnvConflicts: true,
      });

      try {
        await runProductionSeed({
          execute: true,
          config: validConfig,
          customPrismaClient: failingClient,
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain("[Prod Seed] Execution failed safely. Raw errors suppressed.");
        expect(msg).not.toContain("secret_pw_456");
        expect(msg).not.toContain("secret_user");
      }
    });

    it("runProductionVerification sanitizes error output and never leaks driver error objects", async () => {
      const failingMockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn().mockRejectedValue(
          new Error("Query failed on postgresql://leak_user:leak_pw@ep-leak.aws.neon.tech/db")
        ),
        $disconnect: vi.fn().mockResolvedValue(undefined),
      };

      const validConfig = loadProductionConfig({
        explicitEnv: {
          DATABASE_URL: validDirect,
          DATABASE_URL_POOLED: validPooled,
          AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
          ADMIN_EMAIL: "admin@ayawarta.com",
          ADMIN_PASSWORD: "Password123!",
          APPROVED_NEON_TARGET_FINGERPRINT: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
        },
        ignoreProcessEnvConflicts: true,
      });

      try {
        await runProductionVerification({
          execute: true,
          config: validConfig,
          checkEmptyOnly: true,
          mockClient: failingMockClient,
        });
        expect.unreachable("Should have thrown");
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain("[Prod Verify] Verification failed safely. Raw errors suppressed.");
        expect(msg).not.toContain("leak_pw");
        expect(msg).not.toContain("leak_user");
        expect(msg).not.toContain("postgresql://");
      }
    });
  });

  describe("NEO-08 & NEO-14 — Mandatory Target Approval Gate on Live CLIs & Complete Tuple Binding", () => {
    const validFingerprint = "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner";

    const configWithoutApproval = loadProductionConfig({
      explicitEnv: {
        DATABASE_URL: validDirect,
        DATABASE_URL_POOLED: validPooled,
        AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
        ADMIN_EMAIL: "admin@ayawarta.com",
        ADMIN_PASSWORD: "Password123!",
      },
      ignoreProcessEnvConflicts: true,
    });

    const configWithApproval = loadProductionConfig({
      explicitEnv: {
        DATABASE_URL: validDirect,
        DATABASE_URL_POOLED: validPooled,
        AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
        ADMIN_EMAIL: "admin@ayawarta.com",
        ADMIN_PASSWORD: "Password123!",
        APPROVED_NEON_TARGET_FINGERPRINT: validFingerprint,
      },
      ignoreProcessEnvConflicts: true,
    });

    it("prod:migrate fails closed before connecting when approved target is missing (status: UNPROVEN)", async () => {
      const runner = vi.fn();
      await expect(
        runProductionMigration({
          execute: true,
          config: configWithoutApproval,
          runner,
        })
      ).rejects.toThrow(
        "Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)"
      );

      expect(runner).not.toHaveBeenCalled();
    });

    it("prod:migrate mutation test: fails closed before connecting when endpoint is wrong", async () => {
      const runner = vi.fn();
      await expect(
        runProductionMigration({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-wrong-endpoint:ayawarta_prod:ayawarta_owner",
          runner,
        })
      ).rejects.toThrow(
        "Target mismatch: Neon endpoint does not match the approved production target identity."
      );

      expect(runner).not.toHaveBeenCalled();
    });

    it("prod:migrate mutation test: fails closed before connecting when database is wrong", async () => {
      const runner = vi.fn();
      await expect(
        runProductionMigration({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:wrong_db:ayawarta_owner",
          runner,
        })
      ).rejects.toThrow(
        "Target mismatch: Neon database does not match the approved production target identity."
      );

      expect(runner).not.toHaveBeenCalled();
    });

    it("prod:migrate mutation test: fails closed before connecting when role is wrong", async () => {
      const runner = vi.fn();
      await expect(
        runProductionMigration({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:ayawarta_prod:wrong_role",
          runner,
        })
      ).rejects.toThrow(
        "Target mismatch: Neon role does not match the approved production target identity."
      );

      expect(runner).not.toHaveBeenCalled();
    });

    it("prod:migrate succeeds preflight when approved target tuple matches", async () => {
      const runner = vi.fn().mockReturnValue({ status: 0 });
      const res = await runProductionMigration({
        execute: true,
        config: configWithApproval,
        runner,
      });

      expect(res.executed).toBe(true);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it("prod:seed fails closed before connecting when approved target is missing (status: UNPROVEN)", async () => {
      const mockPrisma = {
        $transaction: vi.fn(),
        $disconnect: vi.fn(),
      } as unknown as PrismaClient;

      await expect(
        runProductionSeed({
          execute: true,
          config: configWithoutApproval,
          customPrismaClient: mockPrisma,
        })
      ).rejects.toThrow(
        "Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)"
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("prod:seed mutation test: fails closed when endpoint, database, or role is wrong", async () => {
      const mockPrisma = {
        $transaction: vi.fn(),
        $disconnect: vi.fn(),
      } as unknown as PrismaClient;

      await expect(
        runProductionSeed({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-wrong-endpoint:ayawarta_prod:ayawarta_owner",
          customPrismaClient: mockPrisma,
        })
      ).rejects.toThrow("Target mismatch: Neon endpoint");

      await expect(
        runProductionSeed({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:wrong_db:ayawarta_owner",
          customPrismaClient: mockPrisma,
        })
      ).rejects.toThrow("Target mismatch: Neon database");

      await expect(
        runProductionSeed({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:ayawarta_prod:wrong_role",
          customPrismaClient: mockPrisma,
        })
      ).rejects.toThrow("Target mismatch: Neon role");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("prod:verify fails closed before connecting when approved target is missing (status: UNPROVEN)", async () => {
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn(),
      };

      await expect(
        runProductionVerification({
          execute: true,
          config: configWithoutApproval,
          checkEmptyOnly: true,
          mockClient,
        })
      ).rejects.toThrow(
        "Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)"
      );

      expect(mockClient.$queryRaw).not.toHaveBeenCalled();
    });

    it("prod:verify mutation test: fails closed when endpoint, database, or role is wrong", async () => {
      const mockClient: DatabaseMetadataClient = {
        $queryRaw: vi.fn(),
      };

      await expect(
        runProductionVerification({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-wrong-endpoint:ayawarta_prod:ayawarta_owner",
          checkEmptyOnly: true,
          mockClient,
        })
      ).rejects.toThrow("Target mismatch: Neon endpoint");

      await expect(
        runProductionVerification({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:wrong_db:ayawarta_owner",
          checkEmptyOnly: true,
          mockClient,
        })
      ).rejects.toThrow("Target mismatch: Neon database");

      await expect(
        runProductionVerification({
          execute: true,
          config: configWithApproval,
          approvedTarget: "ep-cool-fog-123456:ayawarta_prod:wrong_role",
          checkEmptyOnly: true,
          mockClient,
        })
      ).rejects.toThrow("Target mismatch: Neon role");

      expect(mockClient.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("NEO-13 — Prisma Config Does Not Trust Shell Marker Alone & Performs Full On-Load Validation", () => {
    const validFingerprint = "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner";

    it("forged wrapper marker alone fails closed without valid production config and approval", () => {
      expect(() =>
        assertPrismaTargetGuard(
          {
            AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
          },
          { explicitEnv: {} }
        )
      ).toThrow("Production Prisma execution requires both DATABASE_URL (direct) and DATABASE_URL_POOLED (pooled) configured.");
    });

    it("forged wrapper marker with non-Neon remote database fails closed (rejects Aiven, AWS RDS, Supabase)", () => {
      expect(() =>
        assertPrismaTargetGuard(
          {
            AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
          },
          {
            explicitEnv: {
              DATABASE_URL: "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/ayawarta?sslmode=require",
              DATABASE_URL_POOLED: "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/ayawarta?sslmode=require",
              APPROVED_NEON_TARGET_FINGERPRINT: "ayawarta-pg:ayawarta:user",
            },
          }
        )
      ).toThrow("does not belong to authorized Neon domain (*.neon.tech)");
    });

    it("forged wrapper marker with Neon target but missing target approval fails closed with UNPROVEN", () => {
      expect(() =>
        assertPrismaTargetGuard(
          {
            AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
          },
          {
            explicitEnv: {
              DATABASE_URL: validDirect,
              DATABASE_URL_POOLED: validPooled,
              APPROVED_NEON_TARGET_FINGERPRINT: undefined,
            },
          }
        )
      ).toThrow("Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN)");
    });

    it("forged wrapper marker with Neon target and mismatched approval tuple fails closed", () => {
      expect(() =>
        assertPrismaTargetGuard(
          {
            AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
          },
          {
            explicitEnv: {
              DATABASE_URL: validDirect,
              DATABASE_URL_POOLED: validPooled,
              APPROVED_NEON_TARGET_FINGERPRINT: "ep-wrong-endpoint:ayawarta_prod:ayawarta_owner",
            },
          }
        )
      ).toThrow("Target mismatch: Neon endpoint");
    });

    it("valid wrapper execution with verified Neon targets and matching approval tuple returns isProduction: true", () => {
      const result = assertPrismaTargetGuard(
        {
          AYAWARTA_EXECUTION_CONTEXT: "production_migration_wrapper",
        },
        {
          explicitEnv: {
            DATABASE_URL: validDirect,
            DATABASE_URL_POOLED: validPooled,
            APPROVED_NEON_TARGET_FINGERPRINT: validFingerprint,
          },
        }
      );

      expect(result.isProduction).toBe(true);
      expect(result.sanitizedTarget?.targetApprovalStatus).toBe("verified");
      expect(result.sanitizedTarget?.database).toBe("ayawarta_prod");
    });

    it("default Prisma config strictly rejects remote Neon target URL", () => {
      expect(() =>
        assertPrismaTargetGuard({
          DATABASE_URL: validDirect,
        })
      ).toThrow(
        "Direct Prisma CLI execution against remote database targets is prohibited via default prisma.config.ts"
      );
    });

    it("default Prisma config strictly rejects remote non-Neon targets (Aiven, Supabase)", () => {
      expect(() =>
        assertPrismaTargetGuard({
          DATABASE_URL: "postgresql://user:pass@ayawarta-pg.aivencloud.com:12345/ayawarta?sslmode=require",
        })
      ).toThrow(
        "Direct Prisma CLI execution against remote database targets is prohibited via default prisma.config.ts"
      );
    });

    it("default Prisma config strictly rejects forged old boolean markers", () => {
      expect(() =>
        assertPrismaTargetGuard({
          AYAWARTA_PRODUCTION_PREFLIGHT_PASSED: "1",
        })
      ).toThrow(
        "Direct Prisma CLI execution with production environment markers is prohibited via default prisma.config.ts"
      );

      expect(() =>
        assertPrismaTargetGuard({
          AYAWARTA_TARGET_ENV: "production",
        })
      ).toThrow(
        "Direct Prisma CLI execution with production environment markers is prohibited via default prisma.config.ts"
      );
    });

    it("default Prisma config allows localhost, 127.0.0.1, and ::1", () => {
      expect(
        assertPrismaTargetGuard({
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ayawarta",
        })
      ).toEqual({ isProduction: false });

      expect(
        assertPrismaTargetGuard({
          DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/ayawarta",
        })
      ).toEqual({ isProduction: false });

      expect(
        assertPrismaTargetGuard({
          DATABASE_URL: "postgresql://postgres:postgres@[::1]:5432/ayawarta",
        })
      ).toEqual({ isProduction: false });
    });
  });

  describe("NEO-10 — Piped Migration Runner Output & Strict Secret Suppression", () => {
    const configWithApproval = loadProductionConfig({
      explicitEnv: {
        DATABASE_URL: validDirect,
        DATABASE_URL_POOLED: validPooled,
        AUTH_SECRET: "mock-auth-secret-32-bytes-long-here",
        ADMIN_EMAIL: "admin@ayawarta.com",
        ADMIN_PASSWORD: "Password123!",
        APPROVED_NEON_TARGET_FINGERPRINT: "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner",
      },
      ignoreProcessEnvConflicts: true,
    });

    it("suppresses secrets emitted by child process on stdout", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const secretStdoutRunner = vi.fn().mockReturnValue({
          status: 1,
          stdout: "Connection failure: postgresql://admin:leaked_super_token_999@ep-cool-fog-123456.neon.tech/db",
          stderr: "",
        });

        await expect(
          runProductionMigration({
            execute: true,
            config: configWithApproval,
            runner: secretStdoutRunner,
          })
        ).rejects.toThrow("[Prod Migration] Execution failed safely. Raw errors suppressed.");

        const allLogs = [
          ...consoleLogSpy.mock.calls.flat(),
          ...consoleErrorSpy.mock.calls.flat(),
        ].join(" ");

        expect(allLogs).not.toContain("leaked_super_token_999");
        expect(allLogs).not.toContain("postgresql://admin");
      } finally {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });

    it("suppresses secrets emitted by child process on stderr", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const secretStderrRunner = vi.fn().mockReturnValue({
          status: 1,
          stdout: "",
          stderr: "FATAL: password 'my_secret_production_password_xyz' failed for database ayawarta_prod",
        });

        await expect(
          runProductionMigration({
            execute: true,
            config: configWithApproval,
            runner: secretStderrRunner,
          })
        ).rejects.toThrow("[Prod Migration] Execution failed safely. Raw errors suppressed.");

        const allLogs = [
          ...consoleLogSpy.mock.calls.flat(),
          ...consoleErrorSpy.mock.calls.flat(),
        ].join(" ");

        expect(allLogs).not.toContain("my_secret_production_password_xyz");
      } finally {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });

    it("suppresses secrets when child process runner throws an exception containing credentials", async () => {
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const throwingRunner = vi.fn().mockImplementation(() => {
          throw new Error("Process crash: DATABASE_URL=postgresql://user:fatal_secret_pass@ep-host/db");
        });

        await expect(
          runProductionMigration({
            execute: true,
            config: configWithApproval,
            runner: throwingRunner,
          })
        ).rejects.toThrow("[Prod Migration] Execution failed safely. Raw errors suppressed.");

        const allLogs = [
          ...consoleLogSpy.mock.calls.flat(),
          ...consoleErrorSpy.mock.calls.flat(),
        ].join(" ");

        expect(allLogs).not.toContain("fatal_secret_pass");
      } finally {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      }
    });

    it("passes production migration wrapper context and approved target fingerprint to child process environment", async () => {
      let passedEnv: NodeJS.ProcessEnv | undefined;
      const capturingRunner = vi.fn().mockImplementation((_cmd, env) => {
        passedEnv = env;
        return { status: 0 };
      });

      await runProductionMigration({
        execute: true,
        config: configWithApproval,
        runner: capturingRunner,
      });

      expect(capturingRunner).toHaveBeenCalledTimes(1);
      expect(passedEnv?.AYAWARTA_EXECUTION_CONTEXT).toBe("production_migration_wrapper");
      expect(passedEnv?.DATABASE_URL).toBe(validDirect);
      expect(passedEnv?.APPROVED_NEON_TARGET_FINGERPRINT).toBe("ep-cool-fog-123456:ayawarta_prod:ayawarta_owner");
    });
  });

  describe("NEO-11 — Full 31 Canonical MediaAsset 1:1 Verification", () => {
    const validAssets: MediaAssetRecord[] = CANONICAL_PRODUCTION_MEDIA.map((m, idx) => ({
      id: `asset-${idx + 1}`,
      publicId: m.publicId,
      secureUrl: m.secureUrl,
      folder: m.folder,
      resourceType: m.resourceType,
      format: m.format,
      bytes: m.bytes,
      width: m.width,
      height: m.height,
      originalName: m.originalName,
    }));

    it("verifies exact 31 canonical media assets matching all 9 schema columns", () => {
      const result = verifyCanonicalMediaAssets(validAssets);
      expect(result.matchedCount).toBe(31);
      expect(result.message).toContain("All 31 MediaAsset records match canonical production catalog 1:1");
    });

    it("rejects when asset count is less than 31", () => {
      const incomplete = validAssets.slice(0, 30);
      expect(() => verifyCanonicalMediaAssets(incomplete)).toThrow(
        "MediaAsset count mismatch: expected exactly 31 assets in database, found 30."
      );
    });

    it("rejects when asset count is greater than 31", () => {
      const extra = [
        ...validAssets,
        {
          ...validAssets[0],
          id: "asset-extra",
          publicId: "ayawarta/production/invitations/extra-asset",
        },
      ];
      expect(() => verifyCanonicalMediaAssets(extra)).toThrow(
        "MediaAsset count mismatch: expected exactly 31 assets in database, found 32."
      );
    });

    it("rejects duplicate publicIds in database", () => {
      const duplicate = [
        ...validAssets.slice(0, 30),
        {
          ...validAssets[0],
          id: "asset-31-dup",
        },
      ];
      expect(() => verifyCanonicalMediaAssets(duplicate)).toThrow(
        `Duplicate MediaAsset found in database with publicId '${validAssets[0].publicId}'.`
      );
    });

    it("rejects foreign / unexpected publicIds not in canonical catalog", () => {
      const foreign = [
        ...validAssets.slice(0, 30),
        {
          ...validAssets[30],
          publicId: "ayawarta/production/invitations/unauthorized/rogue-image",
        },
      ];
      expect(() => verifyCanonicalMediaAssets(foreign)).toThrow(
        "Unexpected MediaAsset 'ayawarta/production/invitations/unauthorized/rogue-image' found in database that does not exist in canonical catalog."
      );
    });

    it("rejects missing canonical asset", () => {
      const dup = [...validAssets];
      dup[5] = { ...validAssets[0] };
      expect(() => verifyCanonicalMediaAssets(dup)).toThrow("Duplicate MediaAsset found");
    });

    it("rejects mutation on secureUrl", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, secureUrl: "https://res.cloudinary.com/ayawarta/image/upload/tampered.jpg" } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("MediaAsset metadata mismatch for");
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("secureUrl expected");
    });

    it("rejects mutation on folder", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, folder: "wrong/folder" } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("folder expected");
    });

    it("rejects mutation on resourceType", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, resourceType: "raw" } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("resourceType expected");
    });

    it("rejects mutation on format", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, format: "png" } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("format expected");
    });

    it("rejects mutation on bytes", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, bytes: a.bytes + 1000 } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("bytes expected");
    });

    it("rejects mutation on width", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, width: (a.width ?? 100) + 50 } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("width expected");
    });

    it("rejects mutation on height", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, height: (a.height ?? 100) + 50 } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("height expected");
    });

    it("rejects mutation on originalName", () => {
      const mutated = validAssets.map((a, i) =>
        i === 0 ? { ...a, originalName: "altered_name.jpg" } : a
      );
      expect(() => verifyCanonicalMediaAssets(mutated)).toThrow("originalName expected");
    });

    it("verifies total seed count across all 9 tables is strictly 86", () => {
      expect(EXPECTED_SEED_COUNTS.user).toBe(1);
      expect(EXPECTED_SEED_COUNTS.mediaAsset).toBe(31);
      expect(EXPECTED_SEED_COUNTS.invitation).toBe(4);
      expect(EXPECTED_SEED_COUNTS.invitationSections).toBe(4);
      expect(EXPECTED_SEED_COUNTS.partner).toBe(8);
      expect(EXPECTED_SEED_COUNTS.event).toBe(6);
      expect(EXPECTED_SEED_COUNTS.galleryItem).toBe(21);
      expect(EXPECTED_SEED_COUNTS.loveStory).toBe(6);
      expect(EXPECTED_SEED_COUNTS.giftAccount).toBe(5);

      const totalExpected = Object.values(EXPECTED_SEED_COUNTS).reduce((sum, count) => sum + count, 0);
      expect(totalExpected).toBe(86);
    });
  });
});
