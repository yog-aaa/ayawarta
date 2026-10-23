import "server-only";

export class DbGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbGuardError";
  }
}

export const DatabaseTargetError = DbGuardError;
export type DatabaseTargetError = DbGuardError;

export interface SanitizedDbTarget {
  protocol: string;
  host: string;
  port: number;
  database: string;
}

const ALLOWED_PROTOCOLS = new Set(["postgresql:", "postgres:"]);
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ALLOWED_PORT = 5432;
const ALLOWED_DATABASE = "ayawarta";

/**
 * Validates that DATABASE_URL strictly points to the authorized local PostgreSQL database.
 * Fails closed on any non-local host, incorrect port, incorrect database name,
 * dangerous query parameters, or malformed connection string.
 *
 * NEVER exposes or reflects credentials, usernames, passwords, or raw URLs in error messages.
 */
export function validateLocalDatabaseTarget(
  rawUrl: string | undefined = process.env.DATABASE_URL
): SanitizedDbTarget {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new DbGuardError(
      "DATABASE_URL is not configured or is empty. Local seed requires a valid local connection string."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DbGuardError(
      "DATABASE_URL is malformed and could not be parsed as a valid URL."
    );
  }

  // 1. Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new DbGuardError(
      `Disallowed protocol '${parsed.protocol}'. Only 'postgresql:' is permitted.`
    );
  }

  // 2. Host check (strip IPv6 brackets if present)
  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, "");
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new DbGuardError(
      `Disallowed database host. Only local PostgreSQL ('localhost', '127.0.0.1', '::1') is authorized for local seed.`
    );
  }

  // 3. Port check (empty port in URL defaults to 5432 for postgresql)
  const portStr = parsed.port;
  const port = portStr ? Number.parseInt(portStr, 10) : ALLOWED_PORT;
  if (Number.isNaN(port) || port !== ALLOWED_PORT) {
    throw new DbGuardError(
      `Disallowed port '${portStr}'. Local seed requires port ${ALLOWED_PORT}.`
    );
  }

  // 4. Database name check
  // Pathname is "/ayawarta" -> database is "ayawarta"
  const rawDb = parsed.pathname.replace(/^\//, "");
  if (rawDb !== ALLOWED_DATABASE) {
    throw new DbGuardError(
      `Disallowed database name. Local seed must target '${ALLOWED_DATABASE}'.`
    );
  }

  // 5. Query parameters check
  // Disallow suspicious/dangerous parameters such as host overrides
  if (parsed.searchParams.has("host")) {
    throw new DbGuardError(
      "Disallowed 'host' query parameter in DATABASE_URL."
    );
  }

  return {
    protocol: parsed.protocol,
    host: hostname,
    port,
    database: rawDb,
  };
}

/**
 * Asserts that DATABASE_URL points to the approved local PostgreSQL instance.
 * Logs only sanitized target components (never credentials).
 * Throws DbGuardError if validation fails.
 */
export function assertLocalDatabaseTarget(
  rawUrl: string | undefined = process.env.DATABASE_URL,
  logger: Pick<Console, "log"> = console
): SanitizedDbTarget {
  const target = validateLocalDatabaseTarget(rawUrl);
  logger.log(
    `[DB Guard] Target verified: ${target.protocol}//[credentials-hidden]@${target.host}:${target.port}/${target.database}`
  );
  return target;
}
