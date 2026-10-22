import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  type AdminRole,
  type AuthenticatedAdmin,
  LOCK_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "./types";
import { loginSchema, normalizeEmail } from "./schema";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "./password";

export interface AuthDatabaseUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
}

export type AuthDatabaseClient = Pick<PrismaClient, "user">;

let defaultDb: AuthDatabaseClient | null = null;

async function getDefaultDb(): Promise<AuthDatabaseClient> {
  if (!defaultDb) {
    const { prisma } = await import("@/lib/server/db");
    defaultDb = prisma;
  }
  return defaultDb;
}

/**
 * Concurrency-safe helper to record a failed login attempt.
 * - If a previous lock has expired, atomically resets counter to 1 and clears the lock.
 * - Otherwise, atomically increments failedLoginCount in PostgreSQL via field increment.
 * - When counter reaches MAX_FAILED_LOGIN_ATTEMPTS (5), locks the account for 15 minutes.
 */
export async function recordFailedLoginAttempt(
  userId: string,
  now: Date,
  db: AuthDatabaseClient
): Promise<void> {
  // Step 1: Check and reset expired lock atomically
  const expiredReset = await db.user.updateMany({
    where: {
      id: userId,
      lockedUntil: { lte: now },
    },
    data: {
      failedLoginCount: 1,
      lockedUntil: null,
    },
  });

  if (expiredReset.count > 0) {
    return;
  }

  // Step 2: Atomic increment using PostgreSQL atomic field operation
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: { increment: 1 },
    },
    select: {
      id: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  // Step 3: Apply 15-minute lock if threshold reached
  if (updated.failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    await db.user.updateMany({
      where: {
        id: userId,
        failedLoginCount: { gte: MAX_FAILED_LOGIN_ATTEMPTS },
        lockedUntil: null,
      },
      data: {
        lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      },
    });
  }
}

/**
 * Concurrency-safe helper to reset lockout counters upon successful authentication.
 */
export async function recordSuccessfulLogin(
  userId: string,
  db: AuthDatabaseClient
): Promise<void> {
  await db.user.updateMany({
    where: {
      id: userId,
      OR: [
        { failedLoginCount: { gt: 0 } },
        { lockedUntil: { not: null } },
      ],
    },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Verifies admin credentials against the PostgreSQL user store.
 * - Rejects malformed, empty, or oversized (>72 bytes) input before DB or bcrypt work.
 * - Always performs equivalent bcrypt work to prevent timing enumeration.
 * - Uses atomic persistence operations to guarantee concurrency safety under parallel attempts.
 */
export async function verifyAdminCredentials(
  emailInput: unknown,
  passwordInput: unknown,
  customDb?: AuthDatabaseClient
): Promise<AuthenticatedAdmin | null> {
  const parsed = loginSchema.safeParse({
    email: emailInput,
    password: passwordInput,
  });

  if (!parsed.success) {
    return null;
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const password = parsed.data.password;

  const db = customDb ?? (await getDefaultDb());

  const user = (await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      isActive: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  })) as AuthDatabaseUser | null;

  const now = new Date();

  // If user does not exist, perform dummy hash verification to prevent timing leaks
  if (!user) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  // Check if account is currently locked
  const isCurrentlyLocked = Boolean(user.lockedUntil && user.lockedUntil > now);
  if (isCurrentlyLocked) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  // Check if account is active and has an approved admin role
  const isAllowedRole = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  if (!user.isActive || !isAllowedRole) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  // Verify the provided password against the stored bcrypt hash
  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    await recordFailedLoginAttempt(user.id, now, db);
    return null;
  }

  // Login successful: reset failure counters atomically
  await recordSuccessfulLogin(user.id, db);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Reusable server authorization helper for admin routes and mutations.
 * Verifies that an active admin session exists, the account exists in PostgreSQL,
 * is marked active, is not locked, and holds an approved administrator role.
 */
export async function requireAdminSession(
  customDb?: AuthDatabaseClient,
  sessionGetter?: () => Promise<{ user?: { id?: string } } | null>
): Promise<AuthenticatedAdmin> {
  const getSession =
    sessionGetter ??
    (async () => {
      const { auth } = await import("@/auth");
      return auth();
    });

  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const db = customDb ?? (await getDefaultDb());
  const user = (await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lockedUntil: true,
    },
  })) as (AuthDatabaseUser & { role: AdminRole }) | null;

  const now = new Date();
  const isLocked = Boolean(user?.lockedUntil && user.lockedUntil > now);
  const isAllowedRole = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  if (!user || !user.isActive || isLocked || !isAllowedRole) {
    throw new Error("Forbidden");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/**
 * Non-throwing session verifier for Server Components (e.g. /admin/login).
 * Returns the AuthenticatedAdmin if current session is backed by an active,
 * non-locked administrator in PostgreSQL. Returns null if unauthenticated,
 * deleted, inactive, locked, or role-revoked, avoiding redirect loops.
 */
export async function getValidAdminSession(
  customDb?: AuthDatabaseClient,
  sessionGetter?: () => Promise<{ user?: { id?: string } } | null>
): Promise<AuthenticatedAdmin | null> {
  try {
    return await requireAdminSession(customDb, sessionGetter);
  } catch {
    return null;
  }
}
