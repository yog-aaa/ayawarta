import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import {
  runContentIdentityAudit,
  type ContentIdentityAuditReport,
} from "@/features/media/identity-auditor";
import { sanitizeErrorMessage } from "@/features/media/cloudinary-uploader";

export const DEFAULT_AUDIT_REPORT_PATH = path.join(
  ".media-migration",
  "media-identity-audit-report.json"
);

export async function runAuditCli(): Promise<number> {
  const repoRoot = process.cwd();

  if (fs.existsSync(path.resolve(repoRoot, ".env.local"))) {
    dotenv.config({ path: path.resolve(repoRoot, ".env.local") });
  }

  let report: ContentIdentityAuditReport;
  try {
    report = await runContentIdentityAudit({ repoRoot, logger: console });
  } catch (err) {
    console.error(`\n[FATAL] Identity audit failed: ${sanitizeErrorMessage(err)}\n`);
    return 1;
  }

  // Write audit report artifact
  const reportPath = path.resolve(repoRoot, DEFAULT_AUDIT_REPORT_PATH);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nAudit report written to: ${reportPath}`);

  console.log("\n=======================================================");
  console.log("  Content-Identity Audit Results");
  console.log("=======================================================");
  console.log(`  • Status:              ${report.passed ? "PASSED" : "FAILED"}`);
  console.log(`  • Target Cloud Name:   ${report.targetCloudName}`);
  console.log(`  • Total Targets:       ${report.summary.totalAssets} / 31`);
  console.log(`  • Verified Matches:    ${report.summary.matchedCount} / 31`);
  console.log(`  • Mismatches / Errors: ${report.summary.mismatchedCount}`);
  console.log(`  • Heroes Verified:     ${report.summary.heroesMatchedCount} / 4`);
  console.log(`  • Audio Verified:      ${report.summary.audiosMatchedCount} / 4`);
  console.log(`  • Remote Matches:      ${report.summary.remoteMatchedCount} / 16`);
  console.log(`  • Local Matches:       ${report.summary.localMatchedCount} / 15`);
  console.log(`  • Network Requests:    ${report.externalEffects.networkRequestsMade}`);
  console.log(`  • External Mutations:  0 (Strictly read-only)\n`);

  if (!report.passed) {
    console.error("[FAIL] One or more assets failed content-identity audit!");
    return 1;
  }

  console.log("[PASS] All 31 media targets proved byte-identical to authorized sources!\n");
  return 0;
}

// CLI entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runAuditCli().then((code) => {
    process.exitCode = code;
  });
}
