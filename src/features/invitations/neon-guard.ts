export class NeonTargetGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeonTargetGuardError";
  }
}

export interface ApprovedTargetIdentity {
  endpoint: string; // e.g. "ep-cool-fog-123456"
  database: string; // e.g. "ayawarta_prod"
  role: string;     // e.g. "ayawarta_owner"
}

export type ApprovedTargetInput =
  | string // e.g. "ep-cool-fog-123456:ayawarta_prod:ayawarta_owner" or "ep-cool-fog-123456/ayawarta_prod/ayawarta_owner"
  | ApprovedTargetIdentity;

export interface SanitizedNeonTarget {
  protocol: string;
  directHostMasked: string;
  pooledHostMasked: string;
  database: string;
  region: string;
  endpointPrefixMasked: string;
  tlsEnforced: boolean;
  targetApprovalStatus: "verified" | "UNPROVEN";
  approvedTargetFingerprintMasked?: string;
  approvedTargetIdMasked?: string;
}

export interface NeonTargetInputs {
  directUrl: string | undefined;
  pooledUrl: string | undefined;
  approvedTarget?: ApprovedTargetInput;
  approvedTargetId?: string;
  requireApprovedTarget?: boolean;
}

/**
 * Parses and validates an approved target identity input into its canonical 3-tuple (NEO-14).
 * Returns undefined if input is missing or incomplete (fail-closed).
 */
export function parseApprovedTargetIdentity(
  input: ApprovedTargetInput | undefined
): ApprovedTargetIdentity | undefined {
  if (!input) return undefined;

  if (typeof input === "object") {
    const endpoint = input.endpoint?.trim();
    const database = input.database?.trim();
    const role = input.role?.trim();
    if (!endpoint || !database || !role) {
      return undefined;
    }
    return { endpoint, database, role };
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    let parts: string[];
    if (trimmed.includes(":")) {
      parts = trimmed.split(":");
    } else if (trimmed.includes("/")) {
      parts = trimmed.split("/");
    } else {
      // Incomplete tuple (only single identifier without database and role)
      return undefined;
    }

    if (parts.length !== 3) {
      return undefined;
    }

    const [endpoint, database, role] = parts.map((p) => p.trim());
    if (!endpoint || !database || !role) {
      return undefined;
    }

    return { endpoint, database, role };
  }

  return undefined;
}

const ALLOWED_PROTOCOLS = new Set(["postgresql:", "postgres:"]);
const NEON_DOMAIN_SUFFIX = ".neon.tech";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const VALID_SSL_MODES = new Set(["require", "verify-ca", "verify-full"]);
const DANGEROUS_PARAMS = ["host", "options", "target_session_attrs", "sslrootcert"];

/**
 * Masks a Neon endpoint prefix (e.g. "ep-cool-fog-123456" -> "ep-***").
 * Never prints raw endpoint identifiers in full.
 */
function maskEndpointPrefix(endpoint: string): string {
  if (endpoint.startsWith("ep-")) {
    return "ep-***";
  }
  return "***";
}

/**
 * Masks a Neon hostname (e.g. "ep-cool-fog-123456.us-east-2.aws.neon.tech" -> "ep-***.us-east-2.aws.neon.tech").
 */
function maskNeonHost(host: string, isPooled: boolean): string {
  const parts = host.split(".");
  const prefix = isPooled ? "ep-***-pooler" : "ep-***";
  if (parts.length > 1) {
    return [prefix, ...parts.slice(1)].join(".");
  }
  return prefix;
}

/**
 * Validates that directUrl and pooledUrl point to the authorized Neon PostgreSQL project (NEO-05).
 *
 * Enforces:
 * 1. Both URLs are present, non-empty, and valid URLs.
 * 2. Both use postgresql: or postgres: protocols.
 * 3. Both belong to the authorized Neon domain (*.neon.tech).
 * 4. Localhost, 127.0.0.1, ::1, and non-Neon providers are strictly rejected.
 * 5. Direct URL does NOT use a -pooler endpoint.
 * 6. Pooled URL DOES use a -pooler endpoint.
 * 7. Both endpoints match the exact same Neon project and region.
 * 8. Both URLs target the exact same database name.
 * 9. Both URLs use the exact same database user/role.
 * 10. Disallows dangerous query parameters (host, options, target_session_attrs, sslrootcert).
 * 11. Requires TLS enforcement (sslmode=require, verify-ca, verify-full) on both URLs.
 * 12. Validates approved target identity binding without leaking raw endpoint IDs.
 *
 * FAILS CLOSED on any mismatch or violation.
 * NEVER prints, logs, or returns passwords, raw URLs, usernames, or unmasked endpoint IDs in error messages.
 */
export function validateNeonDatabaseTargets(inputs: NeonTargetInputs): SanitizedNeonTarget {
  if (!inputs.directUrl || typeof inputs.directUrl !== "string" || inputs.directUrl.trim().length === 0) {
    throw new NeonTargetGuardError(
      "Direct DATABASE_URL is not configured or is empty. Production operations require a valid direct Neon connection string."
    );
  }

  if (!inputs.pooledUrl || typeof inputs.pooledUrl !== "string" || inputs.pooledUrl.trim().length === 0) {
    throw new NeonTargetGuardError(
      "Pooled DATABASE_URL_POOLED is not configured or is empty. Production runtime requires a valid pooled Neon connection string."
    );
  }

  let parsedDirect: URL;
  try {
    parsedDirect = new URL(inputs.directUrl.trim());
  } catch {
    throw new NeonTargetGuardError("Direct DATABASE_URL is malformed and could not be parsed as a URL.");
  }

  let parsedPooled: URL;
  try {
    parsedPooled = new URL(inputs.pooledUrl.trim());
  } catch {
    throw new NeonTargetGuardError("Pooled DATABASE_URL_POOLED is malformed and could not be parsed as a URL.");
  }

  // 1. Protocol check
  if (!ALLOWED_PROTOCOLS.has(parsedDirect.protocol)) {
    throw new NeonTargetGuardError(
      `Disallowed protocol in direct DATABASE_URL. Only 'postgresql:' or 'postgres:' is permitted.`
    );
  }
  if (!ALLOWED_PROTOCOLS.has(parsedPooled.protocol)) {
    throw new NeonTargetGuardError(
      `Disallowed protocol in pooled DATABASE_URL_POOLED. Only 'postgresql:' or 'postgres:' is permitted.`
    );
  }

  // 2. Host extraction and local rejection
  const directHost = parsedDirect.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const pooledHost = parsedPooled.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (LOCAL_HOSTS.has(directHost) || directHost.endsWith(".localhost")) {
    throw new NeonTargetGuardError("Disallowed database host: localhost is rejected for production direct targets.");
  }
  if (LOCAL_HOSTS.has(pooledHost) || pooledHost.endsWith(".localhost")) {
    throw new NeonTargetGuardError("Disallowed database host: localhost is rejected for production pooled targets.");
  }

  // 3. Neon domain check
  if (!directHost.endsWith(NEON_DOMAIN_SUFFIX)) {
    throw new NeonTargetGuardError(
      "Disallowed database host: direct host does not belong to authorized Neon domain (*.neon.tech)."
    );
  }
  if (!pooledHost.endsWith(NEON_DOMAIN_SUFFIX)) {
    throw new NeonTargetGuardError(
      "Disallowed database host: pooled host does not belong to authorized Neon domain (*.neon.tech)."
    );
  }

  // 4. Direct vs Pooled host structure
  const directParts = directHost.split(".");
  const pooledParts = pooledHost.split(".");

  if (directParts.length < 3 || pooledParts.length < 3) {
    throw new NeonTargetGuardError("Malformed Neon host: insufficient domain segments.");
  }

  const directEndpoint = directParts[0];
  const pooledEndpoint = pooledParts[0];

  if (directEndpoint.includes("-pooler")) {
    throw new NeonTargetGuardError(
      "Invalid direct connection: direct DATABASE_URL must point to the direct endpoint, not a -pooler endpoint."
    );
  }

  if (!pooledEndpoint.includes("-pooler")) {
    throw new NeonTargetGuardError(
      "Invalid pooled connection: pooled DATABASE_URL_POOLED must point to a -pooler endpoint."
    );
  }

  // 5. Endpoint and region equivalence
  const expectedPooledEndpoint = `${directEndpoint}-pooler`;
  if (pooledEndpoint !== expectedPooledEndpoint) {
    throw new NeonTargetGuardError(
      "Target mismatch: direct and pooled endpoints belong to different Neon projects or endpoint IDs."
    );
  }

  const directDomainRest = directParts.slice(1).join(".");
  const pooledDomainRest = pooledParts.slice(1).join(".");
  if (directDomainRest !== pooledDomainRest) {
    throw new NeonTargetGuardError(
      "Target mismatch: direct and pooled endpoints belong to different Neon regions or cloud providers."
    );
  }

  // 6. Database name check
  const directDb = parsedDirect.pathname.replace(/^\//, "").trim();
  const pooledDb = parsedPooled.pathname.replace(/^\//, "").trim();

  if (!directDb) {
    throw new NeonTargetGuardError("Database name is missing in direct DATABASE_URL.");
  }
  if (!pooledDb) {
    throw new NeonTargetGuardError("Database name is missing in pooled DATABASE_URL_POOLED.");
  }
  if (directDb !== pooledDb) {
    throw new NeonTargetGuardError("Target mismatch: direct and pooled connections target different databases.");
  }

  // 7. Role / Username check
  const directUser = parsedDirect.username.trim();
  const pooledUser = parsedPooled.username.trim();

  if (!directUser) {
    throw new NeonTargetGuardError("Database user/role is missing in direct DATABASE_URL.");
  }
  if (!pooledUser) {
    throw new NeonTargetGuardError("Database user/role is missing in pooled DATABASE_URL_POOLED.");
  }
  if (directUser !== pooledUser) {
    throw new NeonTargetGuardError("Target mismatch: direct and pooled connections use different database roles.");
  }

  // 8. Disallowed query parameters (NEO-05)
  for (const param of DANGEROUS_PARAMS) {
    if (parsedDirect.searchParams.has(param) || parsedPooled.searchParams.has(param)) {
      throw new NeonTargetGuardError(`Disallowed query parameter '${param}' in connection URL.`);
    }
  }

  // 9. TLS enforcement check (NEO-05)
  const directSsl = parsedDirect.searchParams.get("sslmode")?.toLowerCase();
  const pooledSsl = parsedPooled.searchParams.get("sslmode")?.toLowerCase();

  if (!directSsl || !VALID_SSL_MODES.has(directSsl)) {
    throw new NeonTargetGuardError(
      "Direct DATABASE_URL must enforce TLS with 'sslmode=require' (or verify-ca/verify-full). Missing or disallowed sslmode."
    );
  }

  if (!pooledSsl || !VALID_SSL_MODES.has(pooledSsl)) {
    throw new NeonTargetGuardError(
      "Pooled DATABASE_URL_POOLED must enforce TLS with 'sslmode=require' (or verify-ca/verify-full). Missing or disallowed sslmode."
    );
  }

  if (
    parsedDirect.searchParams.get("ssl") === "false" ||
    parsedDirect.searchParams.get("sslmode") === "disable"
  ) {
    throw new NeonTargetGuardError("Direct DATABASE_URL has disallowed SSL downgrade parameter.");
  }

  if (
    parsedPooled.searchParams.get("ssl") === "false" ||
    parsedPooled.searchParams.get("sslmode") === "disable"
  ) {
    throw new NeonTargetGuardError("Pooled DATABASE_URL_POOLED has disallowed SSL downgrade parameter.");
  }

  // 10. Approved target identity binding (NEO-05, NEO-08, NEO-14)
  let targetApprovalStatus: "verified" | "UNPROVEN" = "UNPROVEN";
  let approvedTargetFingerprintMasked: string | undefined;

  const rawTargetInput = inputs.approvedTarget ?? inputs.approvedTargetId;
  const parsedApprovedTarget = parseApprovedTargetIdentity(rawTargetInput);

  if (parsedApprovedTarget) {
    approvedTargetFingerprintMasked = `${maskEndpointPrefix(parsedApprovedTarget.endpoint)}/${parsedApprovedTarget.database}/${parsedApprovedTarget.role}`;

    // 10a. Endpoint check
    if (directEndpoint !== parsedApprovedTarget.endpoint) {
      throw new NeonTargetGuardError(
        "Target mismatch: Neon endpoint does not match the approved production target identity."
      );
    }

    // 10b. Database name check
    if (directDb !== parsedApprovedTarget.database) {
      throw new NeonTargetGuardError(
        "Target mismatch: Neon database does not match the approved production target identity."
      );
    }

    // 10c. Role check
    if (directUser !== parsedApprovedTarget.role) {
      throw new NeonTargetGuardError(
        "Target mismatch: Neon role does not match the approved production target identity."
      );
    }

    targetApprovalStatus = "verified";
  } else {
    if (inputs.requireApprovedTarget) {
      throw new NeonTargetGuardError(
        "Target approval gate failed: approved production target identity has not been provided or verified (status: UNPROVEN). Owner approval of the exact Neon target tuple (endpoint ID, database name, and role) is required before live operations."
      );
    }
    targetApprovalStatus = "UNPROVEN";
  }

  const region = directParts.slice(1, -2).join(".");

  return {
    protocol: parsedDirect.protocol,
    directHostMasked: maskNeonHost(directHost, false),
    pooledHostMasked: maskNeonHost(pooledHost, true),
    database: directDb,
    region,
    endpointPrefixMasked: maskEndpointPrefix(directEndpoint),
    tlsEnforced: true,
    targetApprovalStatus,
    approvedTargetFingerprintMasked,
    approvedTargetIdMasked: approvedTargetFingerprintMasked
      ? maskEndpointPrefix(parsedApprovedTarget?.endpoint ?? "")
      : undefined,
  };
}

/**
 * Asserts that direct and pooled Neon targets are valid, TLS-enforced, and compatible.
 * Logs only sanitized target components.
 * Throws NeonTargetGuardError if validation fails.
 */
export function assertNeonDatabaseTargets(
  inputs: NeonTargetInputs,
  logger: Pick<Console, "log"> = console
): SanitizedNeonTarget {
  const target = validateNeonDatabaseTargets(inputs);
  logger.log(
    `[Neon Guard] Target verified: direct=${target.directHostMasked}/${target.database}, pooled=${target.pooledHostMasked}/${target.database}, tls=enforced, approval=${target.targetApprovalStatus}`
  );
  return target;
}
