import "server-only";

import { type AdminRole } from "./types";
import { BCRYPT_MAX_BYTES, getUtf8ByteLength, normalizeEmail } from "./schema";
import { hashPassword } from "./password";

export const MIN_BOOTSTRAP_PASSWORD_LENGTH = 8;
export const BOOTSTRAP_GENERIC_FAILURE_MESSAGE = "Administrator bootstrap failed.";

export interface BootstrapDatabaseClient {
  user: {
    findUnique(args: {
      where: { email: string };
      select: { id: boolean };
    }): Promise<{ id: string } | null>;
    upsert(args: {
      where: { email: string };
      update: {
        name: string;
        passwordHash: string;
        role: AdminRole;
        isActive: boolean;
        failedLoginCount: number;
        lockedUntil: Date | null;
      };
      create: {
        email: string;
        name: string;
        passwordHash: string;
        role: AdminRole;
        isActive: boolean;
        failedLoginCount: number;
        lockedUntil: Date | null;
      };
    }): Promise<{ id: string; email: string }>;
  };
}

export type BootstrapAdminInput = {
  email: string;
  password: string;
  name?: string;
  role?: AdminRole;
};

export type BootstrapAdminResult = {
  email: string;
  outcome: "created" | "updated";
};

export type BootstrapLogger = {
  log: (message: string) => void;
  error: (message: string) => void;
};

/**
 * Idempotently creates or updates an administrator account from configuration.
 * Strictly validates that password has at least 8 characters and does not exceed 72 bytes.
 * Always hashes the password before persistence and never exposes raw secrets.
 */
export async function bootstrapAdminUser(
  input: BootstrapAdminInput,
  db: BootstrapDatabaseClient
): Promise<BootstrapAdminResult> {
  const normalizedEmail = normalizeEmail(input.email || "");
  const password = input.password || "";

  const passwordByteLength = getUtf8ByteLength(password);
  const isPasswordValid =
    password.length >= MIN_BOOTSTRAP_PASSWORD_LENGTH &&
    passwordByteLength <= BCRYPT_MAX_BYTES;

  if (!normalizedEmail || !isPasswordValid) {
    throw new Error("Invalid bootstrap credentials");
  }

  const passwordHash = await hashPassword(password);
  const name = input.name || "AyaWarta Administrator";
  const role: AdminRole = input.role || "SUPER_ADMIN";

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  await db.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name,
      passwordHash,
      role,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: normalizedEmail,
      name,
      passwordHash,
      role,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return {
    email: normalizedEmail,
    outcome: existing ? "updated" : "created",
  };
}

/**
 * Safe CLI runner for administrator bootstrap.
 * On success: logs only the normalized email and outcome.
 * On failure: logs only a fixed generic failure message (preventing disclosure
 * of database URLs, hosts, schemas, passwords, hashes, or stack traces) and returns exit code 1.
 */
export async function runBootstrapCli(
  getEnv: () => { ADMIN_EMAIL?: string; ADMIN_PASSWORD?: string },
  db: BootstrapDatabaseClient,
  logger: BootstrapLogger = console
): Promise<number> {
  try {
    const env = getEnv();
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      logger.error(BOOTSTRAP_GENERIC_FAILURE_MESSAGE);
      return 1;
    }

    const result = await bootstrapAdminUser(
      {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        name: "AyaWarta Administrator",
        role: "SUPER_ADMIN",
      },
      db
    );

    logger.log(
      `Administrator bootstrapped successfully: ${result.email} (${result.outcome})`
    );
    return 0;
  } catch {
    logger.error(BOOTSTRAP_GENERIC_FAILURE_MESSAGE);
    return 1;
  }
}

export type BootstrapOrchestrationOptions = {
  runner: () => Promise<number>;
  disconnect: () => Promise<void>;
  setExitCode?: (code: number) => void;
  logger?: BootstrapLogger;
};

/**
 * Orchestrates administrator bootstrap execution:
 * - Executes the CLI runner;
 * - Sets process.exitCode for non-zero or failure results without calling process.exit();
 * - Always awaits disconnect() in a finally block so database connections are cleanly closed;
 * - On unexpected runner rejection, logs the generic failure message and sets exit code 1.
 */
export async function executeBootstrapOrchestration(
  options: BootstrapOrchestrationOptions
): Promise<number> {
  const setExitCode =
    options.setExitCode ??
    ((code: number) => {
      process.exitCode = code;
    });
  const logger = options.logger ?? console;

  let exitCode = 1;
  try {
    exitCode = await options.runner();
    if (exitCode !== 0) {
      setExitCode(exitCode);
    }
  } catch {
    logger.error(BOOTSTRAP_GENERIC_FAILURE_MESSAGE);
    exitCode = 1;
    setExitCode(1);
  } finally {
    await options.disconnect();
  }

  return exitCode;
}
