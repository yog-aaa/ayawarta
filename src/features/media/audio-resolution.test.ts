import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeSha256,
  DefaultLocalAudioResolver,
  getLocalAudioDescriptor,
  hasValidMp3Signature,
  isLocalAudioSlug,
  LOCAL_AUDIO_DESCRIPTORS,
  LOCAL_AUDIO_INPUT_DIR,
  type LocalAudioDescriptor,
  validateLocalAudioSource,
} from "./audio-resolution";
import { verifyOperatorAudioInputs } from "../../../scripts/verify-local-audio";

describe("audio-resolution", () => {
  let tempDir: string;
  let audioDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-audio-test-"));
    audioDir = path.join(tempDir, LOCAL_AUDIO_INPUT_DIR);
    fs.mkdirSync(audioDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("descriptors contract", () => {
    it("contains exactly 3 local audio descriptors", () => {
      expect(LOCAL_AUDIO_DESCRIPTORS.length).toBe(3);
      const slugs = LOCAL_AUDIO_DESCRIPTORS.map((d) => d.slug);
      expect(slugs).toEqual(["rika-fauzi", "shidqi-mita", "default-preview"]);
    });

    it("has intentional duplicate SHA-256 between shidqi-mita and default-preview but distinct public IDs", () => {
      const shidqi = getLocalAudioDescriptor("shidqi-mita");
      const preview = getLocalAudioDescriptor("default-preview");

      // Shared content
      expect(shidqi.expectedByteSize).toBe(preview.expectedByteSize);
      expect(shidqi.expectedByteSize).toBe(2263386);
      expect(shidqi.expectedSha256).toBe(preview.expectedSha256);
      expect(shidqi.expectedSha256).toBe(
        "1AEBA6C98E8F2079081216DD3554A87E295F4562460CED2F7C7F1572120F711F"
      );

      // Distinct identities
      expect(shidqi.slug).not.toBe(preview.slug);
      expect(shidqi.fileName).not.toBe(preview.fileName);
      expect(shidqi.relativeSourcePath).not.toBe(preview.relativeSourcePath);
      expect(shidqi.targetPublicId).not.toBe(preview.targetPublicId);
      expect(shidqi.targetPublicId).toBe(
        "ayawarta/production/invitations/shidqi-mita/audio/background-music"
      );
      expect(preview.targetPublicId).toBe(
        "ayawarta/production/invitations/default-preview/audio/background-music"
      );
    });

    it("verifies rika-fauzi descriptor specifications", () => {
      const rika = getLocalAudioDescriptor("rika-fauzi");
      expect(rika.expectedByteSize).toBe(7369389);
      expect(rika.expectedSha256).toBe(
        "48D3A6E9E0ED03416073720FE28C39ACDF6FBE4256BB41E0A83E6142CCBF323B"
      );
      expect(rika.targetPublicId).toBe(
        "ayawarta/production/invitations/rika-fauzi/audio/background-music"
      );
    });

    it("correctly identifies local audio slugs", () => {
      expect(isLocalAudioSlug("rika-fauzi")).toBe(true);
      expect(isLocalAudioSlug("shidqi-mita")).toBe(true);
      expect(isLocalAudioSlug("default-preview")).toBe(true);
      expect(isLocalAudioSlug("dudi-aini")).toBe(false);
      expect(isLocalAudioSlug("unknown-slug")).toBe(false);
    });
  });

  describe("MP3 signature detection", () => {
    it("recognizes ID3v2 header signature", () => {
      // ID3 header: 'I', 'D', '3', version 4, revision 0, flags 0, 4 syncsafe bytes
      const id3Header = Buffer.from([
        0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00,
      ]);
      expect(hasValidMp3Signature(id3Header)).toBe(true);
    });

    it("recognizes MPEG-1 Layer III frame sync signature", () => {
      // 0xFF followed by 0xFB (MPEG-1 Layer 3, no CRC)
      const mpegHeader = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
      expect(hasValidMp3Signature(mpegHeader)).toBe(true);
    });

    it("rejects buffer with less than 4 bytes", () => {
      expect(hasValidMp3Signature(Buffer.from([0x49, 0x44, 0x33]))).toBe(false);
      expect(hasValidMp3Signature(Buffer.alloc(0))).toBe(false);
    });

    it("rejects non-MP3 files such as plain text or PNG", () => {
      expect(hasValidMp3Signature(Buffer.from("RIFF....WAVE"))).toBe(false);
      expect(hasValidMp3Signature(Buffer.from("Hello world plain text"))).toBe(false);
      // PNG magic bytes: \x89PNG
      expect(hasValidMp3Signature(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    });
  });

  describe("validateLocalAudioSource containment and invariants", () => {
    function createMockMp3(name: string, content = "ID3\x04\x00\x00\x00\x00\x01\x00test content"): string {
      const filePath = path.join(audioDir, name);
      fs.writeFileSync(filePath, Buffer.from(content));
      return `${LOCAL_AUDIO_INPUT_DIR}/${name}`;
    }

    it("accepts a valid mock MP3 file within approved audio directory", () => {
      const relPath = createMockMp3("rika-fauzi.mp3");
      const result = validateLocalAudioSource(relPath, {
        repoRoot: tempDir,
        verifyContent: true,
      });

      expect(result.valid).toBe(true);
      expect(result.byteSize).toBeGreaterThan(0);
      expect(result.sha256).toBeDefined();
      expect(result.posixRelativePath).toBe(".media-migration/input/audio/rika-fauzi.mp3");
    });

    it("rejects path traversal (..) in raw source path", () => {
      const result = validateLocalAudioSource(
        ".media-migration/input/audio/../audio/rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/path traversal/);
    });

    it("rejects backslashes in raw source path", () => {
      const result = validateLocalAudioSource(
        ".media-migration\\input\\audio\\rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/backslashes/);
    });

    it("rejects null bytes in raw source path", () => {
      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi\0.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/null bytes/);
    });

    it("rejects drive or UNC paths", () => {
      expect(
        validateLocalAudioSource("C:/.media-migration/input/audio/rika-fauzi.mp3", {
          repoRoot: tempDir,
        }).valid
      ).toBe(false);

      expect(
        validateLocalAudioSource("//server/share/rika-fauzi.mp3", {
          repoRoot: tempDir,
        }).valid
      ).toBe(false);
    });

    it("rejects consecutive slashes and empty segments", () => {
      const result = validateLocalAudioSource(
        ".media-migration/input//audio/rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/empty segments/);
    });

    it("rejects unapproved audio file names", () => {
      const relPath = createMockMp3("unauthorized-song.mp3");
      const result = validateLocalAudioSource(relPath, { repoRoot: tempDir });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/not in approved list/);
    });

    it("rejects non-MP3 extensions", () => {
      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.wav",
        {
          repoRoot: tempDir,
          allowedFileNames: ["rika-fauzi.wav"],
        }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/\.mp3 extension/);
    });

    it("rejects non-existent file", () => {
      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/does not exist/);
    });

    it("rejects 0-byte file", () => {
      const filePath = path.join(audioDir, "rika-fauzi.mp3");
      fs.writeFileSync(filePath, Buffer.alloc(0));

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/0 byte size/);
    });

    it("rejects file located in nested subdirectory under audio dir", () => {
      const nestedDir = path.join(audioDir, "nested");
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(
        path.join(nestedDir, "rika-fauzi.mp3"),
        Buffer.from("ID3\x04\x00\x00\x00\x00\x01\x00nested content")
      );

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/nested/rika-fauzi.mp3",
        { repoRoot: tempDir }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/directly located in/);
    });

    it("rejects file with invalid MP3 signature", () => {
      const filePath = path.join(audioDir, "rika-fauzi.mp3");
      fs.writeFileSync(filePath, Buffer.from("THIS IS NOT AN MP3 FILE AT ALL"));

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        { repoRoot: tempDir, verifyContent: true }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/valid MP3 signature/);
    });

    it("validates exact byte size and SHA-256 against descriptor", () => {
      const content = Buffer.from("ID3\x04\x00\x00\x00\x00\x01\x00exact test content");
      const filePath = path.join(audioDir, "rika-fauzi.mp3");
      fs.writeFileSync(filePath, content);

      const expectedHash = computeSha256(content);
      const testDescriptor: LocalAudioDescriptor = {
        slug: "rika-fauzi",
        relativeSourcePath: ".media-migration/input/audio/rika-fauzi.mp3",
        fileName: "rika-fauzi.mp3",
        expectedByteSize: content.length,
        expectedSha256: expectedHash,
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      };

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        {
          repoRoot: tempDir,
          descriptor: testDescriptor,
          verifyContent: true,
        }
      );
      expect(result.valid).toBe(true);
      expect(result.byteSize).toBe(content.length);
      expect(result.sha256).toBe(expectedHash);
    });

    it("rejects byte size mismatch against descriptor", () => {
      const content = Buffer.from("ID3\x04\x00\x00\x00\x00\x01\x00short");
      const filePath = path.join(audioDir, "rika-fauzi.mp3");
      fs.writeFileSync(filePath, content);

      const testDescriptor: LocalAudioDescriptor = {
        slug: "rika-fauzi",
        relativeSourcePath: ".media-migration/input/audio/rika-fauzi.mp3",
        fileName: "rika-fauzi.mp3",
        expectedByteSize: 9999, // mismatch
        expectedSha256: "DUMMYHASH",
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      };

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        {
          repoRoot: tempDir,
          descriptor: testDescriptor,
          verifyContent: true,
        }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Byte size mismatch/);
    });

    it("rejects SHA-256 mismatch against descriptor", () => {
      const content = Buffer.from("ID3\x04\x00\x00\x00\x00\x01\x00exact test content");
      const filePath = path.join(audioDir, "rika-fauzi.mp3");
      fs.writeFileSync(filePath, content);

      const testDescriptor: LocalAudioDescriptor = {
        slug: "rika-fauzi",
        relativeSourcePath: ".media-migration/input/audio/rika-fauzi.mp3",
        fileName: "rika-fauzi.mp3",
        expectedByteSize: content.length,
        expectedSha256: "0000000000000000000000000000000000000000000000000000000000000000",
        targetPublicId: "ayawarta/production/invitations/rika-fauzi/audio/background-music",
      };

      const result = validateLocalAudioSource(
        ".media-migration/input/audio/rika-fauzi.mp3",
        {
          repoRoot: tempDir,
          descriptor: testDescriptor,
          verifyContent: true,
        }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/SHA-256 hash mismatch/);
    });
  });

  describe("DefaultLocalAudioResolver with dependency injection", () => {
    it("resolves audio when valid mock descriptors and files are provided", () => {
      const content = Buffer.from("ID3\x04\x00\x00\x00\x00\x01\x00mock test content");
      fs.writeFileSync(path.join(audioDir, "rika-fauzi.mp3"), content);

      const mockHash = computeSha256(content);
      const mockDescriptors: LocalAudioDescriptor[] = [
        {
          slug: "rika-fauzi",
          relativeSourcePath: ".media-migration/input/audio/rika-fauzi.mp3",
          fileName: "rika-fauzi.mp3",
          expectedByteSize: content.length,
          expectedSha256: mockHash,
          targetPublicId: "ayawarta/production/invitations/rika-fauzi/audio/background-music",
        },
      ];

      const resolver = new DefaultLocalAudioResolver(
        mockDescriptors,
        LOCAL_AUDIO_INPUT_DIR
      );

      const resolved = resolver.resolveAudio("rika-fauzi", tempDir);
      expect(resolved.byteSize).toBe(content.length);
      expect(resolved.sha256).toBe(mockHash);
      expect(resolved.targetPublicId).toBe(
        "ayawarta/production/invitations/rika-fauzi/audio/background-music"
      );
      expect(resolved.sourceLocation).toBe(".media-migration/input/audio/rika-fauzi.mp3");
    });

    it("throws when slug descriptor is missing", () => {
      const resolver = new DefaultLocalAudioResolver([]);
      expect(() => resolver.resolveAudio("rika-fauzi", tempDir)).toThrow(
        /No local audio descriptor found/
      );
    });
  });

  describe("verifyOperatorAudioInputs fail-closed contract", () => {
    it("fails closed when audio input directory does not exist", () => {
      const nonExistentDir = path.join(tempDir, "does-not-exist");
      const result = verifyOperatorAudioInputs({
        repoRoot: tempDir,
        audioDir: nonExistentDir,
      });
      expect(result.passed).toBe(false);
      expect(result.verifiedCount).toBe(0);
      expect(result.errors.some((e) => e.includes("does not exist"))).toBe(true);
    });

    it("fails closed without skipping when audio files are missing", () => {
      // audioDir exists but is empty
      const result = verifyOperatorAudioInputs({
        repoRoot: tempDir,
        audioDir: LOCAL_AUDIO_INPUT_DIR,
      });
      expect(result.passed).toBe(false);
      expect(result.verifiedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors.some((e) => e.includes("rika-fauzi"))).toBe(true);
      expect(result.errors.some((e) => e.includes("shidqi-mita"))).toBe(true);
      expect(result.errors.some((e) => e.includes("default-preview"))).toBe(true);
    });
  });
});
