import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ALLOWED_AUDIO_FILE_NAMES,
  LOCAL_AUDIO_DESCRIPTORS,
  LOCAL_AUDIO_INPUT_DIR,
  validateLocalAudioSource,
} from "@/features/media/audio-resolution";

export interface VerifyAudioCliOptions {
  repoRoot?: string;
  audioDir?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export interface VerifyAudioResult {
  passed: boolean;
  errors: string[];
  verifiedCount: number;
}

/**
 * Validates the operator-provided local audio inputs fail-closed against canonical descriptors.
 * Never silently skips: all three descriptors must be present, readable, valid MP3s, with matching sizes and hashes.
 */
export function verifyOperatorAudioInputs(
  options?: VerifyAudioCliOptions
): VerifyAudioResult {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const audioDir = options?.audioDir ?? LOCAL_AUDIO_INPUT_DIR;
  const errors: string[] = [];
  let verifiedCount = 0;

  const audioDirAbs = path.resolve(repoRoot, audioDir);
  if (!fs.existsSync(audioDirAbs)) {
    errors.push(
      `Audio input directory does not exist: '${audioDir}'. Expected path: ${audioDirAbs}`
    );
    return { passed: false, errors, verifiedCount: 0 };
  }

  let dirStat: fs.Stats;
  try {
    dirStat = fs.statSync(audioDirAbs);
  } catch (err) {
    errors.push(`Failed to stat audio directory '${audioDir}': ${(err as Error).message}`);
    return { passed: false, errors, verifiedCount: 0 };
  }

  if (!dirStat.isDirectory()) {
    errors.push(`Audio input path is not a directory: '${audioDir}'`);
    return { passed: false, errors, verifiedCount: 0 };
  }

  // Validate all 3 canonical descriptors (fail-closed, no silent skip)
  for (const descriptor of LOCAL_AUDIO_DESCRIPTORS) {
    const val = validateLocalAudioSource(descriptor.relativeSourcePath, {
      repoRoot,
      allowedAudioDir: audioDir,
      descriptor,
      verifyContent: true,
    });

    if (!val.valid) {
      errors.push(`[${descriptor.slug}] Validation failed: ${val.reason}`);
    } else {
      verifiedCount++;
    }
  }

  // Check for unexpected or unauthorized files in audio directory
  try {
    const entries = fs.readdirSync(audioDirAbs);
    for (const entry of entries) {
      if (!ALLOWED_AUDIO_FILE_NAMES.includes(entry)) {
        errors.push(`Unexpected file found in audio directory: '${entry}'`);
      }
    }
  } catch (err) {
    errors.push(`Failed to read audio directory entries: ${(err as Error).message}`);
  }

  // Verify intentional duplicate hash between shidqi-mita and default-preview has distinct public IDs
  const shidqi = LOCAL_AUDIO_DESCRIPTORS.find((d) => d.slug === "shidqi-mita");
  const preview = LOCAL_AUDIO_DESCRIPTORS.find((d) => d.slug === "default-preview");
  if (shidqi && preview) {
    if (shidqi.expectedSha256 !== preview.expectedSha256) {
      errors.push("Expected shidqi-mita and default-preview to have matching SHA-256 hashes");
    }
    if (shidqi.targetPublicId === preview.targetPublicId) {
      errors.push(
        "Intentional duplicate audio must have distinct target public IDs for shidqi-mita and default-preview"
      );
    }
  }

  const passed = errors.length === 0 && verifiedCount === LOCAL_AUDIO_DESCRIPTORS.length;
  return { passed, errors, verifiedCount };
}

export async function runVerifyAudioCli(
  args: string[],
  options?: VerifyAudioCliOptions
): Promise<number> {
  const logger = options?.logger ?? console;
  const repoRoot = options?.repoRoot ?? process.cwd();

  const dirArgIdx = args.indexOf("--audio-dir");
  const audioDir =
    dirArgIdx !== -1 && args[dirArgIdx + 1] ? args[dirArgIdx + 1] : undefined;

  logger.log("\n=======================================================");
  logger.log("  AyaWarta Local Audio Inputs Verification");
  logger.log("=======================================================\n");

  const result = verifyOperatorAudioInputs({
    repoRoot,
    audioDir,
    logger,
  });

  if (!result.passed) {
    logger.error("[FAIL] Local audio inputs verification failed:\n");
    for (const err of result.errors) {
      logger.error(`  - ${err}`);
    }
    logger.log("");
    return 1;
  }

  logger.log("[PASS] All operator local audio inputs successfully verified!");
  for (const descriptor of LOCAL_AUDIO_DESCRIPTORS) {
    logger.log(`  • [${descriptor.slug}]`);
    logger.log(`      File:     ${descriptor.fileName}`);
    logger.log(`      Size:     ${descriptor.expectedByteSize.toLocaleString()} bytes`);
    logger.log(`      SHA-256:  ${descriptor.expectedSha256}`);
    logger.log(`      Target:   ${descriptor.targetPublicId}`);
  }
  logger.log(
    `\n  Verified: ${result.verifiedCount} / ${LOCAL_AUDIO_DESCRIPTORS.length} files (Fail-closed, 0 network, 0 uploads)\n`
  );

  return 0;
}

// CLI execution entrypoint
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  runVerifyAudioCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error("[FATAL] Audio verification execution error:", err.message);
      process.exitCode = 1;
    });
}
