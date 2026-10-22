import { beforeEach, describe, expect, it } from "vitest";
import {
  type AuthDatabaseClient,
  type AuthDatabaseUser,
  getValidAdminSession,
  recordFailedLoginAttempt,
  requireAdminSession,
  verifyAdminCredentials,
} from "./service";
import { hashPassword } from "./password";
import { LOCK_DURATION_MS, MAX_FAILED_LOGIN_ATTEMPTS } from "./types";

function createMockDb(initialUsers: AuthDatabaseUser[] = []): {
  db: AuthDatabaseClient;
  users: Map<string, AuthDatabaseUser>;
  updateCalls: Array<{ id: string; data: Record<string, unknown> }>;
} {
  const users = new Map<string, AuthDatabaseUser>();
  for (const user of initialUsers) {
    users.set(user.email, { ...user });
  }

  const updateCalls: Array<{ id: string; data: Record<string, unknown> }> = [];

  // Mutex queue simulating PostgreSQL row-level locks on UPDATE queries
  let rowLockPromise: Promise<void> = Promise.resolve();

  function withRowLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = rowLockPromise.then(fn);
    rowLockPromise = next.then(() => {}, () => {});
    return next;
  }

  const db = {
    user: {
      async findUnique(args: { where: { email?: string; id?: string } }) {
        // Small async microtask yield simulating asynchronous network I/O
        await Promise.resolve();

        if ("email" in args.where && args.where.email) {
          const user = users.get(args.where.email);
          return user ? ({ ...user } as unknown as never) : null;
        }
        if ("id" in args.where && args.where.id) {
          for (const user of users.values()) {
            if (user.id === args.where.id) {
              return ({ ...user } as unknown as never);
            }
          }
          return null;
        }
        return null;
      },

      async update(args: {
        where: { id: string };
        data: {
          failedLoginCount?: number | { increment: number };
          lockedUntil?: Date | null;
        };
      }) {
        return withRowLock(async () => {
          await Promise.resolve();

          updateCalls.push({ id: args.where.id ?? "", data: args.data as Record<string, unknown> });
          for (const [email, user] of users.entries()) {
            if (user.id === args.where.id) {
              let newFailedLoginCount = user.failedLoginCount;
              if (
                typeof args.data.failedLoginCount === "object" &&
                args.data.failedLoginCount !== null &&
                "increment" in args.data.failedLoginCount
              ) {
                newFailedLoginCount = user.failedLoginCount + (args.data.failedLoginCount.increment as number);
              } else if (typeof args.data.failedLoginCount === "number") {
                newFailedLoginCount = args.data.failedLoginCount;
              }

              const newLockedUntil =
                args.data.lockedUntil !== undefined
                  ? (args.data.lockedUntil as Date | null)
                  : user.lockedUntil;

              const updated: AuthDatabaseUser = {
                ...user,
                failedLoginCount: newFailedLoginCount,
                lockedUntil: newLockedUntil,
              };

              users.set(email, updated);
              return updated as unknown as never;
            }
          }
          throw new Error(`User not found: ${args.where.id}`);
        });
      },

      async updateMany(args: {
        where?: {
          id?: string;
          lockedUntil?: { lte?: Date } | null;
          failedLoginCount?: { gte?: number };
        };
        data: {
          failedLoginCount?: number;
          lockedUntil?: Date | null;
        };
      }) {
        return withRowLock(async () => {
          await Promise.resolve();

          let matchCount = 0;
          for (const [email, user] of users.entries()) {
            if (args.where?.id && user.id !== args.where.id) {
              continue;
            }

            // Check where.lockedUntil.lte condition
            if (args.where && "lockedUntil" in args.where) {
              const cond = args.where.lockedUntil as { lte?: Date } | null;
              if (cond === null) {
                if (user.lockedUntil !== null) continue;
              } else if (cond && typeof cond === "object" && "lte" in cond) {
                if (!user.lockedUntil || user.lockedUntil > (cond.lte as Date)) {
                  continue;
                }
              }
            }

            // Check where.failedLoginCount.gte condition
            if (args.where && "failedLoginCount" in args.where) {
              const cond = args.where.failedLoginCount as { gte?: number } | undefined;
              if (cond && typeof cond === "object" && "gte" in cond) {
                if (user.failedLoginCount < (cond.gte as number)) {
                  continue;
                }
              }
            }

            // Matches! Apply updates
            matchCount++;
            let newFailedCount = user.failedLoginCount;
            if (typeof args.data.failedLoginCount === "number") {
              newFailedCount = args.data.failedLoginCount;
            }

            let newLockedUntil = user.lockedUntil;
            if ("lockedUntil" in args.data) {
              newLockedUntil = args.data.lockedUntil as Date | null;
            }

            users.set(email, {
              ...user,
              failedLoginCount: newFailedCount,
              lockedUntil: newLockedUntil,
            });
          }

          return { count: matchCount };
        });
      },
    },
  };

  return { db: db as unknown as AuthDatabaseClient, users, updateCalls };
}

describe("verifyAdminCredentials", () => {
  let validPasswordHash: string;

  beforeEach(async () => {
    validPasswordHash = await hashPassword("ValidPassword123!");
  });

  it("returns null for malformed, non-string, or empty inputs without querying db", async () => {
    const { db } = createMockDb();
    expect(await verifyAdminCredentials("", "", db)).toBeNull();
    expect(await verifyAdminCredentials("notanemail", "pass", db)).toBeNull();
    expect(await verifyAdminCredentials(null, 123, db)).toBeNull();
  });

  it("returns null immediately for passwords exceeding 72 bytes without querying db or hashing", async () => {
    const { db, users } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const oversizedPassword = "x".repeat(73);
    const result = await verifyAdminCredentials(
      "admin@ayawarta.com",
      oversizedPassword,
      db
    );

    expect(result).toBeNull();
    // User counters must not be touched
    expect(users.get("admin@ayawarta.com")?.failedLoginCount).toBe(0);
  });

  it("returns null when user does not exist", async () => {
    const { db } = createMockDb();
    const result = await verifyAdminCredentials(
      "unknown@ayawarta.com",
      "ValidPassword123!",
      db
    );
    expect(result).toBeNull();
  });

  it("authenticates valid admin and normalizes uppercase email", async () => {
    const { db } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "  ADMIN@Ayawarta.com  ",
      "ValidPassword123!",
      db
    );

    expect(result).toEqual({
      id: "usr-admin-1",
      email: "admin@ayawarta.com",
      name: "Admin Utama",
      role: "ADMIN",
    });
  });

  it("authenticates SUPER_ADMIN successfully", async () => {
    const { db } = createMockDb([
      {
        id: "usr-super-1",
        email: "super@ayawarta.com",
        name: "Super Admin",
        passwordHash: validPasswordHash,
        role: "SUPER_ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "super@ayawarta.com",
      "ValidPassword123!",
      db
    );

    expect(result).toEqual({
      id: "usr-super-1",
      email: "super@ayawarta.com",
      name: "Super Admin",
      role: "SUPER_ADMIN",
    });
  });

  it("rejects inactive users even with correct password", async () => {
    const { db, updateCalls } = createMockDb([
      {
        id: "usr-inactive",
        email: "inactive@ayawarta.com",
        name: "Inactive Admin",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "inactive@ayawarta.com",
      "ValidPassword123!",
      db
    );

    expect(result).toBeNull();
    expect(updateCalls).toHaveLength(0);
  });

  it("rejects locked user while lock is still active", async () => {
    const futureLock = new Date(Date.now() + 10 * 60 * 1000);
    const { db, updateCalls } = createMockDb([
      {
        id: "usr-locked",
        email: "locked@ayawarta.com",
        name: "Locked Admin",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: futureLock,
      },
    ]);

    const result = await verifyAdminCredentials(
      "locked@ayawarta.com",
      "ValidPassword123!",
      db
    );

    expect(result).toBeNull();
    expect(updateCalls).toHaveLength(0);
  });

  it("increments failedLoginCount on wrong password", async () => {
    const { db, users } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 2,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "admin@ayawarta.com",
      "WrongPassword!",
      db
    );

    expect(result).toBeNull();
    const updated = users.get("admin@ayawarta.com");
    expect(updated?.failedLoginCount).toBe(3);
    expect(updated?.lockedUntil).toBeNull();
  });

  it("locks account for 15 minutes when failed attempts reach threshold (5)", async () => {
    const beforeTime = Date.now();
    const { db, users } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 4,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "admin@ayawarta.com",
      "WrongPasswordAgain!",
      db
    );

    const afterTime = Date.now();
    expect(result).toBeNull();
    const updated = users.get("admin@ayawarta.com");
    expect(updated?.failedLoginCount).toBe(MAX_FAILED_LOGIN_ATTEMPTS);
    expect(updated?.lockedUntil).toBeInstanceOf(Date);
    expect(updated?.lockedUntil?.getTime()).toBeGreaterThanOrEqual(
      beforeTime + LOCK_DURATION_MS - 100
    );
    expect(updated?.lockedUntil?.getTime()).toBeLessThanOrEqual(
      afterTime + LOCK_DURATION_MS + 100
    );
  });

  it("resets failedLoginCount to 1 on failure if previous lock has expired", async () => {
    const pastLock = new Date(Date.now() - 5 * 60 * 1000); // expired 5 minutes ago
    const { db, users } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: pastLock,
      },
    ]);

    const result = await verifyAdminCredentials(
      "admin@ayawarta.com",
      "StillWrongPassword",
      db
    );

    expect(result).toBeNull();
    const updated = users.get("admin@ayawarta.com");
    expect(updated?.failedLoginCount).toBe(1);
    expect(updated?.lockedUntil).toBeNull();
  });

  it("resets failedLoginCount and lockedUntil on successful login", async () => {
    const { db, users } = createMockDb([
      {
        id: "usr-admin-1",
        email: "admin@ayawarta.com",
        name: "Admin Utama",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 3,
        lockedUntil: null,
      },
    ]);

    const result = await verifyAdminCredentials(
      "admin@ayawarta.com",
      "ValidPassword123!",
      db
    );

    expect(result).not.toBeNull();
    const updated = users.get("admin@ayawarta.com");
    expect(updated?.failedLoginCount).toBe(0);
    expect(updated?.lockedUntil).toBeNull();
  });
});

describe("Concurrency-safe lockout transitions (AUTH-01)", () => {
  let validPasswordHash: string;

  beforeEach(async () => {
    validPasswordHash = await hashPassword("ValidPassword123!");
  });

  it("safely handles 5 parallel invalid attempts starting from 0 without lost increments and activates lock", async () => {
    const { db, users } = createMockDb([
      {
        id: "usr-admin-concurrent",
        email: "admin@ayawarta.com",
        name: "Admin Concurrency",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    // Launch 5 parallel invalid attempts concurrently
    const attempts = [1, 2, 3, 4, 5].map((i) =>
      verifyAdminCredentials("admin@ayawarta.com", `WrongPass${i}`, db)
    );

    const results = await Promise.all(attempts);
    expect(results.every((r) => r === null)).toBe(true);

    const user = users.get("admin@ayawarta.com");
    // Under atomic increment, all 5 increments must be preserved exactly
    expect(user?.failedLoginCount).toBe(5);
    expect(user?.lockedUntil).toBeInstanceOf(Date);
  });

  it("safely serializes concurrent attempts when previous lock has expired", async () => {
    const expiredLock = new Date(Date.now() - 60 * 1000);
    const { db, users } = createMockDb([
      {
        id: "usr-admin-expired",
        email: "admin@ayawarta.com",
        name: "Admin Expired",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: expiredLock,
      },
    ]);

    // Two parallel calls arrive right when lock has expired
    const [r1, r2] = await Promise.all([
      verifyAdminCredentials("admin@ayawarta.com", "Wrong1", db),
      verifyAdminCredentials("admin@ayawarta.com", "Wrong2", db),
    ]);

    expect(r1).toBeNull();
    expect(r2).toBeNull();

    const user = users.get("admin@ayawarta.com");
    // One reset the expired lock to 1; the other atomically incremented to 2
    expect(user?.failedLoginCount).toBe(2);
    expect(user?.lockedUntil).toBeNull();
  });

  it("recordFailedLoginAttempt idempotently locks when threshold is exceeded under high concurrency", async () => {
    const { db, users } = createMockDb([
      {
        id: "usr-admin-high-load",
        email: "admin@ayawarta.com",
        name: "Admin High Load",
        passwordHash: validPasswordHash,
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 3,
        lockedUntil: null,
      },
    ]);

    const now = new Date();
    // 4 concurrent failures when count is 3 -> final count 7
    await Promise.all([
      recordFailedLoginAttempt("usr-admin-high-load", now, db),
      recordFailedLoginAttempt("usr-admin-high-load", now, db),
      recordFailedLoginAttempt("usr-admin-high-load", now, db),
      recordFailedLoginAttempt("usr-admin-high-load", now, db),
    ]);

    const user = users.get("admin@ayawarta.com");
    expect(user?.failedLoginCount).toBe(7);
    expect(user?.lockedUntil).toBeInstanceOf(Date);
  });
});

describe("requireAdminSession", () => {
  it("throws Unauthorized when session is missing or has no user id", async () => {
    const { db } = createMockDb();
    await expect(
      requireAdminSession(db, async () => null)
    ).rejects.toThrow("Unauthorized");

    await expect(
      requireAdminSession(db, async () => ({ user: {} }))
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Forbidden when user does not exist in db", async () => {
    const { db } = createMockDb();
    await expect(
      requireAdminSession(db, async () => ({ user: { id: "non-existent" } }))
    ).rejects.toThrow("Forbidden");
  });

  it("throws Forbidden when user is marked inactive", async () => {
    const { db } = createMockDb([
      {
        id: "usr-inactive",
        email: "inactive@ayawarta.com",
        name: "Inactive Admin",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    await expect(
      requireAdminSession(db, async () => ({ user: { id: "usr-inactive" } }))
    ).rejects.toThrow("Forbidden");
  });

  it("throws Forbidden when user is locked", async () => {
    const futureLock = new Date(Date.now() + 60 * 1000);
    const { db } = createMockDb([
      {
        id: "usr-locked",
        email: "locked@ayawarta.com",
        name: "Locked Admin",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: futureLock,
      },
    ]);

    await expect(
      requireAdminSession(db, async () => ({ user: { id: "usr-locked" } }))
    ).rejects.toThrow("Forbidden");
  });

  it("returns AuthenticatedAdmin when session is valid, active, and non-locked", async () => {
    const { db } = createMockDb([
      {
        id: "usr-valid",
        email: "admin@ayawarta.com",
        name: "Admin Valid",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const admin = await requireAdminSession(db, async () => ({
      user: { id: "usr-valid" },
    }));

    expect(admin).toEqual({
      id: "usr-valid",
      name: "Admin Valid",
      email: "admin@ayawarta.com",
      role: "ADMIN",
    });
  });
});

describe("getValidAdminSession (AUTH-02 Stale-session verification)", () => {
  it("returns AuthenticatedAdmin for currently active admin in PostgreSQL", async () => {
    const { db } = createMockDb([
      {
        id: "usr-active",
        email: "active@ayawarta.com",
        name: "Active Admin",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const admin = await getValidAdminSession(db, async () => ({
      user: { id: "usr-active" },
    }));

    expect(admin).toEqual({
      id: "usr-active",
      name: "Active Admin",
      email: "active@ayawarta.com",
      role: "ADMIN",
    });
  });

  it("returns null instead of throwing when session is unauthenticated", async () => {
    const { db } = createMockDb();
    const admin = await getValidAdminSession(db, async () => null);
    expect(admin).toBeNull();
  });

  it("returns null when user was deleted from PostgreSQL", async () => {
    const { db } = createMockDb();
    const admin = await getValidAdminSession(db, async () => ({
      user: { id: "deleted-user-id" },
    }));
    expect(admin).toBeNull();
  });

  it("returns null when user has been deactivated in PostgreSQL", async () => {
    const { db } = createMockDb([
      {
        id: "usr-deactivated",
        email: "deactivated@ayawarta.com",
        name: "Deactivated Admin",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: false,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ]);

    const admin = await getValidAdminSession(db, async () => ({
      user: { id: "usr-deactivated" },
    }));
    expect(admin).toBeNull();
  });

  it("returns null when user account has been locked", async () => {
    const futureLock = new Date(Date.now() + 15 * 60 * 1000);
    const { db } = createMockDb([
      {
        id: "usr-locked-stale",
        email: "locked@ayawarta.com",
        name: "Locked Admin",
        passwordHash: "hash",
        role: "ADMIN",
        isActive: true,
        failedLoginCount: 5,
        lockedUntil: futureLock,
      },
    ]);

    const admin = await getValidAdminSession(db, async () => ({
      user: { id: "usr-locked-stale" },
    }));
    expect(admin).toBeNull();
  });
});
