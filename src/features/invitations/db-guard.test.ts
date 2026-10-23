import { describe, expect, it, vi } from "vitest";
import {
  assertLocalDatabaseTarget,
  DbGuardError,
  validateLocalDatabaseTarget,
} from "./db-guard";

describe("Local Database Target Guard (SEED-02)", () => {
  const secretUser = "secret_admin_user";
  const secretPass = encodeURIComponent("SuperSecretP@ssw0rd!#123");

  describe("Approved local targets", () => {
    it("accepts postgresql:// with localhost and port 5432", () => {
      const url = `postgresql://${secretUser}:${secretPass}@localhost:5432/ayawarta`;
      const target = validateLocalDatabaseTarget(url);
      expect(target).toEqual({
        protocol: "postgresql:",
        host: "localhost",
        port: 5432,
        database: "ayawarta",
      });
    });

    it("accepts postgres:// with 127.0.0.1 and query parameters", () => {
      const url = `postgres://${secretUser}:${secretPass}@127.0.0.1:5432/ayawarta?schema=public&sslmode=disable`;
      const target = validateLocalDatabaseTarget(url);
      expect(target).toEqual({
        protocol: "postgres:",
        host: "127.0.0.1",
        port: 5432,
        database: "ayawarta",
      });
    });

    it("accepts IPv6 ::1 loopback host", () => {
      const url = `postgresql://${secretUser}:${secretPass}@[::1]:5432/ayawarta`;
      const target = validateLocalDatabaseTarget(url);
      expect(target.host).toBe("::1");
      expect(target.port).toBe(5432);
      expect(target.database).toBe("ayawarta");
    });

    it("accepts URL without explicit port when protocol is postgresql (defaults to 5432)", () => {
      const url = `postgresql://${secretUser}:${secretPass}@localhost/ayawarta`;
      const target = validateLocalDatabaseTarget(url);
      expect(target.port).toBe(5432);
    });

    it("assertLocalDatabaseTarget logs sanitized components without secrets", () => {
      const url = `postgresql://${secretUser}:${secretPass}@localhost:5432/ayawarta`;
      const logMock = vi.fn();
      assertLocalDatabaseTarget(url, { log: logMock });
      expect(logMock).toHaveBeenCalledTimes(1);
      const logMessage = logMock.mock.calls[0][0];
      expect(logMessage).toContain("localhost:5432/ayawarta");
      expect(logMessage).not.toContain(secretUser);
      expect(logMessage).not.toContain(secretPass);
    });
  });

  describe("Rejected targets and safety boundaries", () => {
    it("rejects missing or empty DATABASE_URL", () => {
      expect(() => validateLocalDatabaseTarget(undefined)).toThrowError(
        DbGuardError
      );
      expect(() => validateLocalDatabaseTarget("")).toThrowError(
        DbGuardError
      );
      expect(() => validateLocalDatabaseTarget("   ")).toThrowError(
        DbGuardError
      );
    });

    it("rejects malformed URL", () => {
      expect(() => validateLocalDatabaseTarget("not-a-valid-url")).toThrowError(
        DbGuardError
      );
    });

    it("rejects Aiven production database host without leaking credentials", () => {
      const aivenUrl = `postgres://${secretUser}:${secretPass}@pg-ayawarta.aivencloud.com:12345/defaultdb`;
      expect(() => validateLocalDatabaseTarget(aivenUrl)).toThrowError(
        DbGuardError
      );

      try {
        validateLocalDatabaseTarget(aivenUrl);
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain("Disallowed database host");
        expect(msg).not.toContain(secretUser);
        expect(msg).not.toContain(secretPass);
      }
    });

    it("rejects non-local LAN/WAN hosts", () => {
      const remoteUrl = `postgresql://${secretUser}:${secretPass}@192.168.1.50:5432/ayawarta`;
      expect(() => validateLocalDatabaseTarget(remoteUrl)).toThrowError(
        /Disallowed database host/
      );
    });

    it("rejects non-5432 port", () => {
      const wrongPortUrl = `postgresql://${secretUser}:${secretPass}@localhost:5433/ayawarta`;
      expect(() => validateLocalDatabaseTarget(wrongPortUrl)).toThrowError(
        /Disallowed port '5433'/
      );
    });

    it("rejects wrong database name", () => {
      const wrongDbUrl = `postgresql://${secretUser}:${secretPass}@localhost:5432/postgres`;
      expect(() => validateLocalDatabaseTarget(wrongDbUrl)).toThrowError(
        /Disallowed database name/
      );

      const prodDbUrl = `postgresql://${secretUser}:${secretPass}@localhost:5432/ayawarta_prod`;
      expect(() => validateLocalDatabaseTarget(prodDbUrl)).toThrowError(
        /Disallowed database name/
      );
    });

    it("rejects non-postgresql protocols (e.g. mysql, http, file)", () => {
      const mysqlUrl = `mysql://${secretUser}:${secretPass}@localhost:5432/ayawarta`;
      expect(() => validateLocalDatabaseTarget(mysqlUrl)).toThrowError(
        /Disallowed protocol 'mysql:'/
      );
    });

    it("rejects dangerous query parameters like host override", () => {
      const badQueryUrl = `postgresql://${secretUser}:${secretPass}@localhost:5432/ayawarta?host=evil.com`;
      expect(() => validateLocalDatabaseTarget(badQueryUrl)).toThrowError(
        /Disallowed 'host' query parameter/
      );
    });
  });
});
