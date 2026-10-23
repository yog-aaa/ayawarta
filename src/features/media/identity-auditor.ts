import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { InvitationSlug, MediaCategory, PhysicalAsset } from "./types";
import { APPROVED_INVITATION_SLUGS } from "./public-id";
import { cloudinaryUploadReportSchema } from "./schema";
import {
  OLD_CLOUDINARY_CLOUD_NAME,
  sanitizeErrorMessage,
  validateCloudinaryDeliveryUrl,
} from "./cloudinary-uploader";
import {
  generateMediaManifest,
  validateRemoteCloudinaryUrl,
} from "../../../scripts/data/invitation-media-manifest";
import type { AudioResolver } from "./audio-resolution";
import type { ImageResolver } from "./image-resolution";

export const DEFAULT_MAX_STREAM_BYTES = 25 * 1024 * 1024; // 25 MB
export const DEFAULT_STREAM_TIMEOUT_MS = 30_000; // 30 seconds

export const APPROVED_LOCAL_AUDIT_ROOTS = [
  "public/images/SAMPLE",
  "public/images/dummy-couples",
  ".media-migration/input/audio",
  ".media-migration/input/images",
] as const;

export interface StreamDigestResult {
  byteCount: number;
  sha256: string;
}

export interface HttpStreamResponse {
  status: number;
  stream: NodeJS.ReadableStream | ReadableStream<Uint8Array>;
  byteLength?: number;
  headers?: Record<string, string>;
}

export type HttpStreamFetcher = (
  url: string,
  options: { signal: AbortSignal }
) => Promise<HttpStreamResponse>;

/**
 * Default streaming HTTP fetcher using native fetch with redirect: "error"
 * to fail closed against redirect spoofing (CLOUD-06).
 */
export async function defaultHttpStreamFetcher(
  url: string,
  options: { signal: AbortSignal }
): Promise<HttpStreamResponse> {
  const res = await fetch(url, {
    signal: options.signal,
    redirect: "error",
  });

  if (!res.ok) {
    throw new Error(`HTTP GET failed with status ${res.status}: ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error("HTTP GET response body is empty");
  }

  return {
    status: res.status,
    stream: res.body,
  };
}

/**
 * Streams chunks of data from a Node Readable or Web ReadableStream into a SHA-256 hasher,
 * enforcing a maximum byte limit to protect against decompression bombs or unbounded streams.
 */
export async function computeStreamDigest(
  stream: NodeJS.ReadableStream | ReadableStream<Uint8Array>,
  maxBytes = DEFAULT_MAX_STREAM_BYTES
): Promise<StreamDigestResult> {
  const hash = crypto.createHash("sha256");
  let byteCount = 0;

  // Convert Web ReadableStream to Node Readable if needed
  const nodeStream: NodeJS.ReadableStream =
    "getReader" in stream
      ? Readable.fromWeb(stream as import("node:stream/web").ReadableStream)
      : stream;

  for await (const chunk of nodeStream) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteCount += bufferChunk.length;

    if (byteCount > maxBytes) {
      throw new Error(
        `Response stream exceeded maximum safety limit of ${maxBytes} bytes (read ${byteCount} bytes)`
      );
    }

    hash.update(bufferChunk);
  }

  return {
    byteCount,
    sha256: hash.digest("hex").toUpperCase(),
  };
}

/**
 * Computes SHA-256 and byte count of a local file on disk via streaming.
 */
export async function computeFileDigest(
  filePath: string,
  maxBytes = DEFAULT_MAX_STREAM_BYTES
): Promise<StreamDigestResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Local file not found: '${filePath}'`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Path is not a regular file: '${filePath}'`);
  }

  if (stat.size > maxBytes) {
    throw new Error(
      `Local file size (${stat.size} bytes) exceeds maximum safety limit of ${maxBytes} bytes`
    );
  }

  const fileStream = fs.createReadStream(filePath);
  return computeStreamDigest(fileStream, maxBytes);
}

/**
 * Validates strict Cloudinary URL security:
 * HTTPS only, host res.cloudinary.com, no credentials, no custom port, no query params, no fragments.
 */
export function validateAuditUrl(
  rawUrl: string,
  expectedCloudName?: string
): { valid: boolean; reason?: string } {
  if (expectedCloudName) {
    if (expectedCloudName === OLD_CLOUDINARY_CLOUD_NAME) {
      const remoteVal = validateRemoteCloudinaryUrl(rawUrl);
      if (!remoteVal.valid) {
        return { valid: false, reason: remoteVal.reason };
      }
    } else {
      const deliveryVal = validateCloudinaryDeliveryUrl(rawUrl, expectedCloudName);
      if (!deliveryVal.valid) {
        return { valid: false, reason: deliveryVal.reason };
      }
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    return { valid: false, reason: `Malformed URL: ${(err as Error).message}` };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: `Must use HTTPS, got '${parsed.protocol}'` };
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return {
      valid: false,
      reason: `Hostname must be strictly 'res.cloudinary.com', got '${parsed.hostname}'`,
    };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: "URL must not contain user credentials" };
  }

  if (parsed.port && parsed.port !== "443") {
    return { valid: false, reason: `URL must not specify custom port '${parsed.port}'` };
  }

  if (parsed.search && parsed.search.length > 0) {
    return { valid: false, reason: "URL must not contain query parameters" };
  }

  if (parsed.hash && parsed.hash.length > 0) {
    return { valid: false, reason: "URL must not contain hash fragments" };
  }

  return { valid: true };
}

/**
 * Strict containment check for local files before streaming or hashing (CLOUD-09).
 * Enforces:
 * - non-empty string, no null bytes, no backslashes, no traversal (..), no drive/UNC paths, no empty segments.
 * - file existence and regular file check.
 * - non-zero file size.
 * - boundary containment within approved local roots using realpath to prevent symlink escapes.
 */
export function validateLocalAuditSource(
  sourceLocation: string,
  repoRoot: string,
  allowedRoots: readonly string[] = APPROVED_LOCAL_AUDIT_ROOTS
): { valid: boolean; absolutePath?: string; reason?: string } {
  if (typeof sourceLocation !== "string" || sourceLocation.length === 0) {
    return { valid: false, reason: "Local source location must be a non-empty string" };
  }

  if (sourceLocation.includes("\0")) {
    return { valid: false, reason: "Local source location cannot contain null bytes" };
  }

  if (sourceLocation.includes("\\")) {
    return { valid: false, reason: "Local source location cannot contain backslashes" };
  }

  if (sourceLocation.includes("..")) {
    return { valid: false, reason: "Local source location cannot contain path traversal (..)" };
  }

  if (/^[a-zA-Z]:/.test(sourceLocation) || sourceLocation.startsWith("//")) {
    return { valid: false, reason: "Local source location cannot be a drive or UNC path" };
  }

  if (sourceLocation.includes("//")) {
    return { valid: false, reason: "Local source location cannot contain empty segments (//)" };
  }

  const normalizedRel = sourceLocation.replace(/^\/+/, "");
  const candidateAbsolute = path.resolve(repoRoot, normalizedRel);

  if (!fs.existsSync(candidateAbsolute)) {
    return { valid: false, reason: `Local source file does not exist: '${normalizedRel}'` };
  }

  // Symlink escape check via realpath
  let candidateRealPath: string;
  let repoRealPath: string;
  try {
    candidateRealPath = fs.realpathSync(candidateAbsolute);
    repoRealPath = fs.realpathSync(path.resolve(repoRoot));
  } catch (err) {
    return { valid: false, reason: `Failed to resolve realpath: ${(err as Error).message}` };
  }

  const relToRepo = path.relative(repoRealPath, candidateRealPath);
  if (relToRepo.startsWith("..") || path.isAbsolute(relToRepo)) {
    return { valid: false, reason: `Resolved path escapes repository root: '${candidateRealPath}'` };
  }

  // Check containment in one of the allowed roots via realpath
  let isContained = false;
  for (const rootRel of allowedRoots) {
    const rootAbs = path.resolve(repoRoot, rootRel);
    if (!fs.existsSync(rootAbs)) continue;
    try {
      const rootRealPath = fs.realpathSync(rootAbs);
      const rel = path.relative(rootRealPath, candidateRealPath);
      if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
        isContained = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!isContained) {
    return {
      valid: false,
      reason: `Resolved path '${candidateRealPath}' is outside approved local roots: ${allowedRoots.join(", ")}`,
    };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(candidateRealPath);
  } catch (err) {
    return { valid: false, reason: `Failed to stat file: ${(err as Error).message}` };
  }

  if (!stat.isFile()) {
    return { valid: false, reason: `Path is not a regular file: '${normalizedRel}'` };
  }

  if (stat.size === 0) {
    return { valid: false, reason: `Local file has 0 byte size: '${normalizedRel}'` };
  }

  return { valid: true, absolutePath: candidateRealPath };
}

export interface AssetAuditRecord {
  targetPublicId: string;
  slug: InvitationSlug;
  category: MediaCategory;
  sourceType: "local" | "remote";
  sourceLocation: string;
  targetSecureUrl: string;
  sourceSha256: string | null;
  targetSha256: string | null;
  sourceBytes: number | null;
  targetBytes: number | null;
  match: boolean;
  error: string | null;
}

export interface AuditTargetAssetInput {
  targetPublicId: string;
  slug: InvitationSlug;
  category: MediaCategory;
  sourceType: "local" | "remote";
  sourceLocation: string;
  secureUrl: string;
}

export interface AuditSingleAssetOptions {
  repoRoot?: string;
  targetCloudName: string;
  fetcher?: HttpStreamFetcher;
  maxBytes?: number;
  timeoutMs?: number;
  allowedLocalRoots?: readonly string[];
}

/**
 * Audits the content identity of a single media asset by comparing the SHA-256 digest
 * and byte count of its source against its live target delivery URL on Cloudinary.
 */
export async function auditSingleAssetContentIdentity(
  asset: AuditTargetAssetInput,
  options: AuditSingleAssetOptions
): Promise<AssetAuditRecord> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const fetcher = options.fetcher ?? defaultHttpStreamFetcher;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_STREAM_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;

  const baseRecord: AssetAuditRecord = {
    targetPublicId: asset.targetPublicId,
    slug: asset.slug,
    category: asset.category,
    sourceType: asset.sourceType,
    sourceLocation: asset.sourceLocation,
    targetSecureUrl: asset.secureUrl,
    sourceSha256: null,
    targetSha256: null,
    sourceBytes: null,
    targetBytes: null,
    match: false,
    error: null,
  };

  try {
    // 1. Validate target delivery URL
    const targetUrlVal = validateAuditUrl(asset.secureUrl, options.targetCloudName);
    if (!targetUrlVal.valid) {
      throw new Error(`Target delivery URL security check failed: ${targetUrlVal.reason}`);
    }

    // 2. Fetch and hash target delivery URL
    const targetAbort = new AbortController();
    const targetTimeout = setTimeout(() => targetAbort.abort(), timeoutMs);

    let targetDigest: StreamDigestResult;
    try {
      const targetRes = await fetcher(asset.secureUrl, { signal: targetAbort.signal });
      if (targetRes.status < 200 || targetRes.status >= 300) {
        throw new Error(`Target HTTP GET failed with status ${targetRes.status}`);
      }
      targetDigest = await computeStreamDigest(targetRes.stream, maxBytes);
    } finally {
      clearTimeout(targetTimeout);
    }

    baseRecord.targetSha256 = targetDigest.sha256;
    baseRecord.targetBytes = targetDigest.byteCount;

    // 3. Compute source digest (local file on disk or remote HTTP stream)
    let sourceDigest: StreamDigestResult;
    if (asset.sourceType === "local") {
      const allowedRoots = options.allowedLocalRoots ?? APPROVED_LOCAL_AUDIT_ROOTS;
      const containment = validateLocalAuditSource(
        asset.sourceLocation,
        repoRoot,
        allowedRoots
      );
      if (!containment.valid) {
        throw new Error(
          `Local source containment failed for '${asset.targetPublicId}': ${containment.reason}`
        );
      }
      sourceDigest = await computeFileDigest(containment.absolutePath!, maxBytes);
    } else {
      // Remote source URL from old Cloudinary
      const sourceUrlVal = validateAuditUrl(asset.sourceLocation, OLD_CLOUDINARY_CLOUD_NAME);
      if (!sourceUrlVal.valid) {
        throw new Error(`Remote source URL security check failed: ${sourceUrlVal.reason}`);
      }

      const sourceAbort = new AbortController();
      const sourceTimeout = setTimeout(() => sourceAbort.abort(), timeoutMs);

      try {
        const sourceRes = await fetcher(asset.sourceLocation, { signal: sourceAbort.signal });
        if (sourceRes.status < 200 || sourceRes.status >= 300) {
          throw new Error(`Remote source HTTP GET failed with status ${sourceRes.status}`);
        }
        sourceDigest = await computeStreamDigest(sourceRes.stream, maxBytes);
      } finally {
        clearTimeout(sourceTimeout);
      }
    }

    baseRecord.sourceSha256 = sourceDigest.sha256;
    baseRecord.sourceBytes = sourceDigest.byteCount;

    // 4. Verify exact equality
    const match =
      sourceDigest.sha256 === targetDigest.sha256 &&
      sourceDigest.byteCount === targetDigest.byteCount;

    baseRecord.match = match;
    if (!match) {
      baseRecord.error = `Content digest mismatch: source (${sourceDigest.byteCount} bytes, SHA-256 ${sourceDigest.sha256}) != target (${targetDigest.byteCount} bytes, SHA-256 ${targetDigest.sha256})`;
    }

    return baseRecord;
  } catch (err) {
    const safeError = sanitizeErrorMessage(err);
    baseRecord.error = safeError;
    baseRecord.match = false;
    return baseRecord;
  }
}

export interface ContentIdentityAuditSummary {
  totalAssets: number;
  matchedCount: number;
  mismatchedCount: number;
  heroesMatchedCount: number;
  audiosMatchedCount: number;
  localMatchedCount: number;
  remoteMatchedCount: number;
}

export interface ContentIdentityAuditReport {
  mode: "content-identity-audit";
  targetCloudName: string;
  auditedAt: string;
  passed: boolean;
  summary: ContentIdentityAuditSummary;
  records: AssetAuditRecord[];
  externalEffects: {
    networkRequestsMade: number;
    uploadsPerformed: 0;
    fileDeletions: 0;
    databaseMutations: 0;
    note: string;
  };
}

export interface RunContentIdentityAuditOptions {
  repoRoot?: string;
  targetCloudName?: string;
  reportPath?: string;
  fetcher?: HttpStreamFetcher;
  maxBytes?: number;
  timeoutMs?: number;
  logger?: Pick<Console, "log" | "warn" | "error">;
  audioResolver?: AudioResolver;
  imageResolver?: ImageResolver;
  allowedLocalRoots?: readonly string[];
}

/**
 * Runs a complete, read-only content-identity audit for all 31 production invitation media targets.
 * Verifies exact SHA-256 and byte counts between sources and live Cloudinary delivery URLs.
 * Strictly read-only: does not upload, overwrite, rename, or delete any asset.
 */
export async function runContentIdentityAudit(
  options?: RunContentIdentityAuditOptions
): Promise<ContentIdentityAuditReport> {
  const repoRoot = options?.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const logger = options?.logger ?? console;

  const defaultReportPath = path.resolve(
    repoRoot,
    ".media-migration",
    "cloudinary-upload-report.json"
  );
  const reportPath = options?.reportPath ? path.resolve(options.reportPath) : defaultReportPath;

  // 1. Report existence check
  if (!fs.existsSync(reportPath)) {
    throw new Error(
      `Cloudinary upload report not found at: '${reportPath}'. Migration must be run before auditing.`
    );
  }

  // 2. Read report text and scan for secret keywords (CLOUD-09)
  let rawText: string;
  try {
    rawText = fs.readFileSync(reportPath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read upload report at '${reportPath}': ${sanitizeErrorMessage(err)}`
    );
  }

  const SECRET_KEYWORDS = [
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "AUTH_SECRET",
    "ADMIN_PASSWORD",
    "DATABASE_URL",
  ];
  for (const kw of SECRET_KEYWORDS) {
    if (rawText.includes(kw)) {
      throw new Error(`Secret keyword '${kw}' detected in upload report payload`);
    }
  }

  // 3. Controlled JSON parse (CLOUD-09)
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawText);
  } catch (err) {
    throw new Error(
      `Failed to parse upload report JSON: ${sanitizeErrorMessage(err)}`
    );
  }

  // 4. Runtime schema validation before dereferencing (CLOUD-09)
  const schemaParse = cloudinaryUploadReportSchema.safeParse(rawJson);
  if (!schemaParse.success) {
    const issue = schemaParse.error.issues[0];
    const pathStr = issue?.path?.join(".") ?? "root";
    throw new Error(
      `Upload report validation failed at '${pathStr}': ${issue?.message ?? "Invalid schema"}`
    );
  }
  const uploadReport = schemaParse.data;

  // 5. Target cloud name validation
  const targetCloudName =
    options?.targetCloudName ??
    uploadReport.targetCloudName ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!targetCloudName || targetCloudName === OLD_CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      `Invalid target cloud name '${targetCloudName}'. Must be the approved target account.`
    );
  }

  if (
    options?.targetCloudName &&
    uploadReport.targetCloudName !== options.targetCloudName
  ) {
    throw new Error(
      `Upload report targetCloudName '${uploadReport.targetCloudName}' does not match expected '${options.targetCloudName}'`
    );
  }

  // 6. Generate fresh canonical manifest from verified resolvers/gates (CLOUD-09)
  const canonicalManifest = generateMediaManifest({
    repoRoot,
    audioResolver: options?.audioResolver,
    imageResolver: options?.imageResolver,
  });

  if (canonicalManifest.physicalAssets.length !== 31) {
    throw new Error(
      `Canonical manifest must contain exactly 31 physical assets, got ${canonicalManifest.physicalAssets.length}`
    );
  }

  // 7. Verify canonical hero and audio invariants (CLOUD-09)
  const canonicalHeroes = canonicalManifest.physicalAssets.filter((a) =>
    a.targetPublicId.endsWith("/couple/hero")
  );
  if (canonicalHeroes.length !== 4) {
    throw new Error(
      `Canonical manifest must contain exactly 4 heroes, got ${canonicalHeroes.length}`
    );
  }
  const canonicalAudios = canonicalManifest.physicalAssets.filter((a) =>
    a.targetPublicId.endsWith("/audio/background-music")
  );
  if (canonicalAudios.length !== 4) {
    throw new Error(
      `Canonical manifest must contain exactly 4 audio assets, got ${canonicalAudios.length}`
    );
  }
  for (const slug of APPROVED_INVITATION_SLUGS) {
    if (!canonicalHeroes.some((h) => h.slug === slug)) {
      throw new Error(`Canonical manifest missing hero for approved slug '${slug}'`);
    }
    if (!canonicalAudios.some((a) => a.slug === slug)) {
      throw new Error(`Canonical manifest missing audio for approved slug '${slug}'`);
    }
  }

  // 8. Build canonical asset map
  const canonicalMap = new Map<string, PhysicalAsset>();
  for (const asset of canonicalManifest.physicalAssets) {
    canonicalMap.set(asset.targetPublicId, asset);
  }

  // 9. Exact unique set equality of 31 public IDs between report and canonical manifest (CLOUD-09)
  if (uploadReport.assets.length !== 31) {
    throw new Error(
      `Upload report must contain exactly 31 physical assets, found ${uploadReport.assets.length}`
    );
  }

  const reportPublicIds = new Set<string>();
  for (const record of uploadReport.assets) {
    if (reportPublicIds.has(record.targetPublicId)) {
      throw new Error(
        `Duplicate target public ID in upload report: '${record.targetPublicId}'`
      );
    }
    reportPublicIds.add(record.targetPublicId);
  }

  for (const pubId of reportPublicIds) {
    if (!canonicalMap.has(pubId)) {
      throw new Error(
        `Extra or unrecognized target public ID in upload report: '${pubId}'`
      );
    }
  }

  for (const pubId of canonicalMap.keys()) {
    if (!reportPublicIds.has(pubId)) {
      throw new Error(`Missing target public ID in upload report: '${pubId}'`);
    }
  }

  // 10. Reconcile metadata and build audit target inputs using canonical metadata/paths (CLOUD-09)
  const allowedRoots = options?.allowedLocalRoots ?? APPROVED_LOCAL_AUDIT_ROOTS;
  const auditInputs: AuditTargetAssetInput[] = [];

  for (const record of uploadReport.assets) {
    const canonical = canonicalMap.get(record.targetPublicId)!;

    if (record.slug !== canonical.slug) {
      throw new Error(
        `Metadata substitution for '${record.targetPublicId}': slug mismatch (report '${record.slug}' != canonical '${canonical.slug}')`
      );
    }
    if (record.category !== canonical.category) {
      throw new Error(
        `Metadata substitution for '${record.targetPublicId}': category mismatch (report '${record.category}' != canonical '${canonical.category}')`
      );
    }
    if (record.sourceType !== canonical.sourceType) {
      throw new Error(
        `Metadata substitution for '${record.targetPublicId}': sourceType mismatch (report '${record.sourceType}' != canonical '${canonical.sourceType}')`
      );
    }
    if (record.sourceLocation !== canonical.sourceLocation) {
      throw new Error(
        `Metadata substitution for '${record.targetPublicId}': sourceLocation mismatch (report '${record.sourceLocation}' != canonical '${canonical.sourceLocation}')`
      );
    }
    if (record.resourceType !== canonical.cloudinaryResourceType) {
      throw new Error(
        `Metadata substitution for '${record.targetPublicId}': resourceType mismatch (report '${record.resourceType}' != canonical '${canonical.cloudinaryResourceType}')`
      );
    }

    if (!record.secureUrl) {
      throw new Error(
        `Upload record for '${record.targetPublicId}' has missing or null secureUrl`
      );
    }

    // Verify local containment on canonical sourceLocation
    if (canonical.sourceType === "local") {
      const containment = validateLocalAuditSource(
        canonical.sourceLocation,
        repoRoot,
        allowedRoots
      );
      if (!containment.valid) {
        throw new Error(
          `Local source containment failed for '${canonical.targetPublicId}': ${containment.reason}`
        );
      }
    }

    auditInputs.push({
      targetPublicId: canonical.targetPublicId,
      slug: canonical.slug,
      category: canonical.category,
      sourceType: canonical.sourceType,
      sourceLocation: canonical.sourceLocation, // Canonical path used for hashing!
      secureUrl: record.secureUrl,
    });
  }

  // 11. Request counter tracking wrapper (CLOUD-10)
  let networkRequestsMade = 0;
  const baseFetcher = options?.fetcher ?? defaultHttpStreamFetcher;
  const trackedFetcher: HttpStreamFetcher = async (url, fetchOpts) => {
    networkRequestsMade++;
    return baseFetcher(url, fetchOpts);
  };

  logger.log("\n=======================================================");
  logger.log("  AyaWarta Read-Only Media Content-Identity Audit");
  logger.log("=======================================================");
  logger.log(`Target Cloudinary Account: '${targetCloudName}'`);
  logger.log(`Auditing 31 physical assets (16 remote, 15 local)...`);

  const records: AssetAuditRecord[] = [];
  let matchedCount = 0;
  let mismatchedCount = 0;
  let heroesMatchedCount = 0;
  let audiosMatchedCount = 0;
  let localMatchedCount = 0;
  let remoteMatchedCount = 0;

  for (let i = 0; i < auditInputs.length; i++) {
    const asset = auditInputs[i];
    logger.log(`  [${i + 1}/31] Auditing ${asset.targetPublicId}...`);

    const record = await auditSingleAssetContentIdentity(asset, {
      repoRoot,
      targetCloudName,
      fetcher: trackedFetcher,
      maxBytes: options?.maxBytes,
      timeoutMs: options?.timeoutMs,
      allowedLocalRoots: allowedRoots,
    });

    records.push(record);

    if (record.match) {
      matchedCount++;
      if (record.sourceType === "local") localMatchedCount++;
      else remoteMatchedCount++;

      if (record.targetPublicId.endsWith("/couple/hero")) {
        heroesMatchedCount++;
      }
      if (record.targetPublicId.endsWith("/audio/background-music")) {
        audiosMatchedCount++;
      }
      logger.log(
        `    ✓ MATCH: ${record.targetBytes} bytes | SHA-256: ${record.targetSha256}`
      );
    } else {
      mismatchedCount++;
      logger.error(`    ✕ MISMATCH / ERROR: ${record.error}`);
    }
  }

  const passed =
    auditInputs.length === 31 &&
    matchedCount === 31 &&
    mismatchedCount === 0 &&
    heroesMatchedCount === 4 &&
    audiosMatchedCount === 4;

  const summary: ContentIdentityAuditSummary = {
    totalAssets: 31,
    matchedCount,
    mismatchedCount,
    heroesMatchedCount,
    audiosMatchedCount,
    localMatchedCount,
    remoteMatchedCount,
  };

  const report: ContentIdentityAuditReport = {
    mode: "content-identity-audit",
    targetCloudName,
    auditedAt: new Date().toISOString(),
    passed,
    summary,
    records,
    externalEffects: {
      networkRequestsMade,
      uploadsPerformed: 0,
      fileDeletions: 0,
      databaseMutations: 0,
      note: "Strictly read-only audit. Zero mutations performed on Cloudinary, database, or local filesystem.",
    },
  };

  return report;
}
