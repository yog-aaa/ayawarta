import "server-only";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { APPROVED_INVITATION_SLUGS } from "@/features/media/public-id";
import type { PrismaClient } from "@/generated/prisma/client";
import type { InvitationRepository } from "@/features/invitations/repository";
import { EXPECTED_SEED_COUNTS } from "@/features/invitations/seed-constants";

export const EXPECTED_COUNTS = EXPECTED_SEED_COUNTS;

export interface VerifySeedDependencies {
  databaseUrl?: string;
  assertTarget?: (url: string | undefined) => unknown;
  loadPrismaClient?: () => Promise<{ prisma: PrismaClient }>;
  loadRepository?: () => Promise<{ invitationRepository: InvitationRepository }>;
}

export async function verifySeed(deps?: VerifySeedDependencies) {
  // Step 1: Target guard executes FIRST before any database module is loaded (SEED-02, SEED-05)
  const assertTarget =
    deps?.assertTarget ??
    (await import("@/features/invitations/db-guard")).assertLocalDatabaseTarget;
  assertTarget(deps?.databaseUrl ?? process.env.DATABASE_URL);

  // Step 2: Load database modules ONLY AFTER target guard has passed (SEED-05)
  let disconnectPrisma: (() => Promise<void>) | undefined;

  try {
    const loadedDb = deps?.loadPrismaClient
      ? await deps.loadPrismaClient()
      : await import("@/lib/server/db");
    const prisma = loadedDb.prisma;
    disconnectPrisma = () => prisma.$disconnect();

    const loadedRepo = deps?.loadRepository
      ? await deps.loadRepository()
      : await import("@/features/invitations/repository");
    const { invitationRepository } = loadedRepo;

    console.log("=== Verifying AyaWarta Seed in Database ===");

    // 1. Table Counts Verification
    const actualCounts = {
      user: await prisma.user.count(),
      mediaAsset: await prisma.mediaAsset.count(),
      invitation: await prisma.invitation.count(),
      invitationSections: await prisma.invitationSections.count(),
      partner: await prisma.partner.count(),
      event: await prisma.event.count(),
      galleryItem: await prisma.galleryItem.count(),
      loveStory: await prisma.loveStory.count(),
      giftAccount: await prisma.giftAccount.count(),
    };

    console.log("Actual Table Counts:", JSON.stringify(actualCounts, null, 2));

    for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
      const actual = actualCounts[table as keyof typeof EXPECTED_COUNTS];
      if (actual !== expected) {
        throw new Error(
          `Count mismatch for table '${table}': expected ${expected}, got ${actual}`
        );
      }
    }
    console.log("[PASS] All 9 table row counts match expected values exactly.");

    // 2. Database Raw Record Verifications (e.g. galleryVideoUrl nullability)
    const rawInvitations = await prisma.invitation.findMany({
      include: { heroAsset: true, musicAsset: true },
    });

    if (rawInvitations.length !== 4) {
      throw new Error(`Expected 4 raw invitations, got ${rawInvitations.length}`);
    }

    for (const raw of rawInvitations) {
      if (!raw.heroAsset) {
        throw new Error(`Invitation '${raw.slug}' has no related heroAsset.`);
      }
      if (raw.slug === "default-preview") {
        if (
          raw.galleryVideoUrl !== "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        ) {
          throw new Error(
            `Expected 'default-preview' galleryVideoUrl to be YouTube link, got: '${raw.galleryVideoUrl}'`
          );
        }
      } else {
        if (raw.galleryVideoUrl !== null) {
          throw new Error(
            `Expected slug '${raw.slug}' galleryVideoUrl to be null, got: '${raw.galleryVideoUrl}'`
          );
        }
      }
    }
    console.log(
      "[PASS] Database galleryVideoUrl correctly stores YouTube URL for 'default-preview' and null for others."
    );

    // 3. Repository Query Reconstruction Verifications
    for (const slug of APPROVED_INVITATION_SLUGS) {
      console.log(`Verifying repository reconstruction for '${slug}'...`);
      const inv = await invitationRepository.findBySlug(slug);

      if (!inv) {
        throw new Error(`Repository returned null for approved slug '${slug}'`);
      }

      // Explicit Hero Image check
      const heroImage = inv.data.couple.heroImage;
      if (
        !heroImage ||
        !heroImage.startsWith("https://res.cloudinary.com/") ||
        !heroImage.includes(`/invitations/${slug}/couple/hero`)
      ) {
        throw new Error(
          `Invalid couple.heroImage for slug '${slug}': '${heroImage}'`
        );
      }

      // Groom and Bride Photo checks
      const groomPhoto = inv.data.couple.groom.photo;
      const bridePhoto = inv.data.couple.bride.photo;
      if (
        !groomPhoto.startsWith("https://res.cloudinary.com/") ||
        !bridePhoto.startsWith("https://res.cloudinary.com/")
      ) {
        throw new Error(
          `Invalid groom/bride photo URL for slug '${slug}': groom='${groomPhoto}', bride='${bridePhoto}'`
        );
      }

      // Gallery Video URL check
      if (slug === "default-preview") {
        if (
          inv.data.gallery?.videoUrl !==
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        ) {
          throw new Error(
            `Domain gallery.videoUrl for 'default-preview' mismatch: '${inv.data.gallery?.videoUrl}'`
          );
        }
      } else {
        if (inv.data.gallery?.videoUrl !== "") {
          throw new Error(
            `Domain gallery.videoUrl for '${slug}' should be empty string, got: '${inv.data.gallery?.videoUrl}'`
          );
        }
      }

      // Music URL check
      if (
        !inv.data.musicUrl ||
        !inv.data.musicUrl.startsWith("https://res.cloudinary.com/") ||
        !inv.data.musicUrl.includes(`/invitations/${slug}/audio/background-music`)
      ) {
        throw new Error(
          `Invalid musicUrl for slug '${slug}': '${inv.data.musicUrl}'`
        );
      }

      // Section specific checks
      if (slug === "rika-fauzi") {
        if (inv.data.events.length !== 2)
          throw new Error("rika-fauzi events count mismatch");
        if (inv.data.gallery?.images.length !== 6)
          throw new Error("rika-fauzi gallery count mismatch");
        if (inv.data.loveStory?.length !== 3)
          throw new Error("rika-fauzi loveStory count mismatch");
        if (inv.data.gifts?.length !== 2)
          throw new Error("rika-fauzi gifts count mismatch");
      } else if (slug === "shidqi-mita") {
        if (inv.data.events.length !== 1)
          throw new Error("shidqi-mita events count mismatch");
        if (inv.data.gallery?.images.length !== 6)
          throw new Error("shidqi-mita gallery count mismatch");
        if (inv.data.loveStory !== undefined)
          throw new Error("shidqi-mita should not have loveStory");
        if (inv.data.gifts !== undefined)
          throw new Error("shidqi-mita should not have gifts");
      } else if (slug === "dudi-aini") {
        if (inv.data.events.length !== 1)
          throw new Error("dudi-aini events count mismatch");
        if (inv.data.gallery?.images.length !== 3)
          throw new Error("dudi-aini gallery count mismatch");
        if (inv.data.loveStory !== undefined)
          throw new Error("dudi-aini should not have loveStory");
        if (inv.data.gifts?.length !== 1)
          throw new Error("dudi-aini gifts count mismatch");
      } else if (slug === "default-preview") {
        if (inv.data.events.length !== 2)
          throw new Error("default-preview events count mismatch");
        if (inv.data.gallery?.images.length !== 6)
          throw new Error("default-preview gallery count mismatch");
        if (inv.data.loveStory?.length !== 3)
          throw new Error("default-preview loveStory count mismatch");
        if (inv.data.gifts?.length !== 2)
          throw new Error("default-preview gifts count mismatch");
      }

      console.log(`[PASS] Reconstructed '${slug}' verified.`);
    }

    // 4. Non-existent slug returns null (no fallback to default-preview)
    const unknownResult = await invitationRepository.findBySlug(
      "non-existent-slug-xyz"
    );
    if (unknownResult !== null) {
      throw new Error(
        "Expected findBySlug('non-existent-slug-xyz') to return null, but received data!"
      );
    }
    console.log("[PASS] Unknown slug returns null without preview fallback.");

    console.log("=== All Seed Verifications Passed Successfully ===");
  } finally {
    if (disconnectPrisma) {
      await disconnectPrisma();
    }
  }
}

async function main() {
  await verifySeed();
}

// Execute when run as script
if (
  process.argv[1] &&
  (process.argv[1].endsWith("verify-seed.ts") ||
    process.argv[1].endsWith("verify-seed.js"))
) {
  main().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
}
