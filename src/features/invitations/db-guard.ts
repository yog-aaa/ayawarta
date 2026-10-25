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
 * Parameters that could redirect the host, port, database, or connection target
 * in PostgreSQL drivers / connection poolers (NEO-15).
 */
const DISALLOWED_TARGET_REDIRECT_PARAMS = new Set([
  "host",
  "hostaddr",
  "port",
  "dbname",
  "database",
  "server",
  "endpoint",
  "target_session_attrs",
  "options",
]);

/**
 * Validates that DATABASE_URL strictly points to the authorized local PostgreSQL database.
 * Fails closed on any non-local host, incorrect port, incorrect database name,
 * connection target redirection query parameters, or malformed connection string.
 *
 * Single consistent validation contract for local runtime and Prisma CLI (NEO-15).
 * NEVER exposes or reflects credentials, usernames, passwords, or raw URLs in error messages.
 */
export function validateLocalDatabaseTarget(
  rawUrl: string | undefined = process.env.DATABASE_URL
): SanitizedDbTarget {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    throw new DbGuardError(
      "DATABASE_URL is not configured or is empty for local deployment. Local database requires a valid local connection string."
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

  // 2. Host check (strip IPv6 brackets if present, support loopback domains like *.localhost)
  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, "");
  const isLoopback = ALLOWED_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  if (!isLoopback) {
    throw new DbGuardError(
      `Disallowed database host for local deployment. Only local PostgreSQL ('localhost', '127.0.0.1', '::1') is authorized for local database.`
    );
  }

  // 3. Port check (empty port in URL defaults to 5432 for postgresql)
  const portStr = parsed.port;
  const port = portStr ? Number.parseInt(portStr, 10) : ALLOWED_PORT;
  if (Number.isNaN(port) || port !== ALLOWED_PORT) {
    throw new DbGuardError(
      `Disallowed port '${portStr}'. Local database requires port ${ALLOWED_PORT}.`
    );
  }

  // 4. Database name check
  // Pathname is "/ayawarta" -> database is "ayawarta"
  const rawDb = parsed.pathname.replace(/^\//, "");
  if (rawDb !== ALLOWED_DATABASE) {
    throw new DbGuardError(
      `Disallowed database name. Local database must target '${ALLOWED_DATABASE}'.`
    );
  }

  // 5. Query parameters check (NEO-15: close host and connection redirection)
  for (const paramKey of parsed.searchParams.keys()) {
    const lowerKey = paramKey.toLowerCase();
    if (DISALLOWED_TARGET_REDIRECT_PARAMS.has(lowerKey)) {
      throw new DbGuardError(
        `Disallowed '${paramKey}' query parameter in DATABASE_URL. Connection target redirection is prohibited.`
      );
    }
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
