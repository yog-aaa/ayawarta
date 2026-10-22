import { describe, expect, it, vi } from "vitest";
import {
  type BootstrapAdminInput,
  type BootstrapDatabaseClient,
  type BootstrapLogger,
  BOOTSTRAP_GENERIC_FAILURE_MESSAGE,
  bootstrapAdminUser,
  executeBootstrapOrchestration,
  runBootstrapCli,
} from "./bootstrap";
import { verifyPassword } from "./password";

function createMockBootstrapDb(): {
  db: BootstrapDatabaseClient;
  storedUsers: Map<string, Record<string, unknown>>;
} {
  const storedUsers = new Map<string, Record<string, unknown>>();

  const db: BootstrapDatabaseClient = {
    user: {
      async findUnique(args) {
        const found = storedUsers.get(args.where.email);
        return found ? { id: found.id as string } : null;
      },
      async upsert(args) {
        const existing = storedUsers.get(args.where.email);
        const record = {
          id: existing ? (existing.id as string) : "usr-generated-id",
          ...(existing ? args.update : args.create),
        };
        storedUsers.set(args.where.email, record);
        return {
          id: record.id,
          email: args.where.email,
        };
      },
    },
  };

  return { db, storedUsers };
}

describe("bootstrapAdminUser", () => {
  it("creates a new administrator with hashed password and default SUPER_ADMIN role", async () => {
    const { db, storedUsers } = createMockBootstrapDb();
    const input: BootstrapAdminInput = {
      email: "  ADMIN@AyaWarta.com  ",
      password: "MySuperSecretPassword2026!",
    };

    const result = await bootstrapAdminUser(input, db);

    expect(result).toEqual({
      email: "admin@ayawarta.com",
      outcome: "created",
    });

    const stored = storedUsers.get("admin@ayawarta.com");
    expect(stored).toBeDefined();
    expect(stored?.email).toBe("admin@ayawarta.com");
    expect(stored?.name).toBe("AyaWarta Administrator");
    expect(stored?.role).toBe("SUPER_ADMIN");
    expect(stored?.isActive).toBe(true);
    expect(stored?.failedLoginCount).toBe(0);
    expect(stored?.lockedUntil).toBeNull();

    // Password must be hashed and never stored in plaintext
    expect(stored?.passwordHash).not.toBe("MySuperSecretPassword2026!");
    expect(typeof stored?.passwordHash).toBe("string");
    const matches = await verifyPassword(
      "MySuperSecretPassword2026!",
      stored?.passwordHash as string
    );
    expect(matches).toBe(true);
  });

  it("updates existing administrator idempotently on rerun", async () => {
    const { db, storedUsers } = createMockBootstrapDb();
    const input: BootstrapAdminInput = {
      email: "admin@ayawarta.com",
      password: "FirstPassword123!",
    };

    // First run creates
    const result1 = await bootstrapAdminUser(input, db);
    expect(result1.outcome).toBe("created");

    // Second run with new password updates
    const input2: BootstrapAdminInput = {
      email: "admin@ayawarta.com",
      password: "SecondPassword456!",
      name: "Custom Admin Name",
      role: "ADMIN",
    };
    const result2 = await bootstrapAdminUser(input2, db);
    expect(result2.outcome).toBe("updated");

    const updated = storedUsers.get("admin@ayawarta.com");
    expect(updated?.name).toBe("Custom Admin Name");
    expect(updated?.role).toBe("ADMIN");

    // Old password no longer matches, new password matches
    expect(
      await verifyPassword("FirstPassword123!", updated?.passwordHash as string)
    ).toBe(false);
    expect(
      await verifyPassword("SecondPassword456!", updated?.passwordHash as string)
    ).toBe(true);
  });

  it("rejects empty email or password", async () => {
    const { db } = createMockBootstrapDb();

    await expect(
      bootstrapAdminUser({ email: "", password: "validpassword8" }, db)
    ).rejects.toThrow("Invalid bootstrap credentials");

    await expect(
      bootstrapAdminUser({ email: "admin@ayawarta.com", password: "" }, db)
    ).rejects.toThrow("Invalid bootstrap credentials");
  });

  it("rejects password shorter than minimum 8 characters", async () => {
    const { db } = createMockBootstrapDb();

    await expect(
      bootstrapAdminUser({ email: "admin@ayawarta.com", password: "short12" }, db)
    ).rejects.toThrow("Invalid bootstrap credentials");
  });

  it("rejects password exceeding 72 bytes", async () => {
    const { db } = createMockBootstrapDb();
    const seventyThreeBytes = "a".repeat(73);

    await expect(
      bootstrapAdminUser(
        { email: "admin@ayawarta.com", password: seventyThreeBytes },
        db
      )
    ).rejects.toThrow("Invalid bootstrap credentials");
  });

  it("rejects multibyte password exceeding 72 bytes even if character count is small", async () => {
    const { db } = createMockBootstrapDb();
    // 25 characters of '日' = 75 bytes
    const multiByteOversized = "日".repeat(25);

    await expect(
      bootstrapAdminUser(
        { email: "admin@ayawarta.com", password: multiByteOversized },
        db
      )
    ).rejects.toThrow("Invalid bootstrap credentials");
  });
});

describe("runBootstrapCli", () => {
  it("outputs safe outcome on success and returns exit code 0", async () => {
    const { db } = createMockBootstrapDb();
    const logs: string[] = [];
    const errors: string[] = [];

    const logger: BootstrapLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => errors.push(msg),
    };

    const exitCode = await runBootstrapCli(
      () => ({
        ADMIN_EMAIL: "admin@ayawarta.com",
        ADMIN_PASSWORD: "SuperSecureAdminPassword123!",
      }),
      db,
      logger
    );

    expect(exitCode).toBe(0);
    expect(errors).toHaveLength(0);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toBe(
      "Administrator bootstrapped successfully: admin@ayawarta.com (created)"
    );
    expect(logs[0]).not.toContain("SuperSecureAdminPassword123!");
  });

  it("outputs generic failure and returns exit code 1 when env is missing", async () => {
    const { db } = createMockBootstrapDb();
    const logs: string[] = [];
    const errors: string[] = [];

    const logger: BootstrapLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => errors.push(msg),
    };

    const exitCode = await runBootstrapCli(() => ({}), db, logger);

    expect(exitCode).toBe(1);
    expect(logs).toHaveLength(0);
    expect(errors).toEqual([BOOTSTRAP_GENERIC_FAILURE_MESSAGE]);
  });

  it("outputs only generic failure without disclosing internal Prisma/database error details", async () => {
    const throwingDb: BootstrapDatabaseClient = {
      user: {
        findUnique: vi.fn().mockRejectedValue(
          new Error("PrismaClientKnownRequestError: Can't reach database server at localhost:5432 with secret_url")
        ),
        upsert: vi.fn(),
      },
    };

    const logs: string[] = [];
    const errors: string[] = [];

    const logger: BootstrapLogger = {
      log: (msg) => logs.push(msg),
      error: (msg) => errors.push(msg),
    };

    const exitCode = await runBootstrapCli(
      () => ({
        ADMIN_EMAIL: "admin@ayawarta.com",
        ADMIN_PASSWORD: "ValidAdminPassword123!",
      }),
      throwingDb,
      logger
    );

    expect(exitCode).toBe(1);
    expect(logs).toHaveLength(0);
    expect(errors).toEqual([BOOTSTRAP_GENERIC_FAILURE_MESSAGE]);
    // Crucial: Must never leak DB host, port, credentials, or internal stack in failure output
    expect(errors[0]).not.toContain("localhost");
    expect(errors[0]).not.toContain("secret_url");
    expect(errors[0]).not.toContain("PrismaClient");
  });
});

describe("executeBootstrapOrchestration (AUTH-07)", () => {
  it("awaits disconnect and returns 0 after successful bootstrap", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    const setExitCodeMock = vi.fn();

    try {
      const exitCode = await executeBootstrapOrchestration({
        runner: vi.fn().mockResolvedValue(0),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
      });

      expect(exitCode).toBe(0);
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(setExitCodeMock).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("awaits disconnect and sets exit code 1 when bootstrap fails", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    const setExitCodeMock = vi.fn();

    try {
      const exitCode = await executeBootstrapOrchestration({
        runner: vi.fn().mockResolvedValue(1),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
      });

      expect(exitCode).toBe(1);
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(setExitCodeMock).toHaveBeenCalledWith(1);
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("awaits disconnect and sets exit code 1 when runner throws unexpectedly", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    const setExitCodeMock = vi.fn();
    const errorLogs: string[] = [];

    const logger: BootstrapLogger = {
      log: vi.fn(),
      error: (msg) => errorLogs.push(msg),
    };

    try {
      const exitCode = await executeBootstrapOrchestration({
        runner: vi.fn().mockRejectedValue(new Error("FATAL: DATABASE_URL=secret-leak")),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
        logger,
      });

      expect(exitCode).toBe(1);
      expect(disconnectMock).toHaveBeenCalledTimes(1);
      expect(setExitCodeMock).toHaveBeenCalledWith(1);
      expect(errorLogs).toEqual([BOOTSTRAP_GENERIC_FAILURE_MESSAGE]);
      expect(errorLogs[0]).not.toContain("secret-leak");
      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("guarantees no direct process.exit() is called across any execution path", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    const setExitCodeMock = vi.fn();

    try {
      // 1. Success
      await executeBootstrapOrchestration({
        runner: vi.fn().mockResolvedValue(0),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
      });

      // 2. Failure with code 1
      await executeBootstrapOrchestration({
        runner: vi.fn().mockResolvedValue(1),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
      });

      // 3. Exception in runner
      await executeBootstrapOrchestration({
        runner: vi.fn().mockRejectedValue(new Error("Uncaught failure")),
        disconnect: disconnectMock,
        setExitCode: setExitCodeMock,
        logger: { log: vi.fn(), error: vi.fn() },
      });

      expect(exitSpy).not.toHaveBeenCalled();
    } finally {
      exitSpy.mockRestore();
    }
  });
});
