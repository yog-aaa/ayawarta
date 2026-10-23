import { describe, expect, it } from "vitest";
import {
  computeSnapshotDigest,
  type DatabaseSnapshot,
} from "./database-snapshot";

function createMockSnapshot(): DatabaseSnapshot {
  return {
    user: [
      {
        id: "usr-1",
        email: "admin@ayawarta.my.id",
        name: "Admin AyaWarta",
        role: "SUPER_ADMIN",
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: "2026-10-23T00:00:00.000Z",
        updatedAt: "2026-10-23T00:00:00.000Z",
      },
    ],
    mediaAsset: [
      {
        id: "med-1",
        publicId: "ayawarta/production/invitations/rika-fauzi/couple/groom",
        secureUrl:
          "https://res.cloudinary.com/uhwi7xvb/image/upload/v1/ayawarta/production/invitations/rika-fauzi/couple/groom.jpg",
        folder: "ayawarta/production/invitations/rika-fauzi/couple",
        resourceType: "IMAGE",
        format: "jpg",
        bytes: 39975,
        width: 358,
        height: 358,
        originalName: "FOTO - Fauzi.jpg",
        createdAt: "2026-10-23T00:00:00.000Z",
        updatedAt: "2026-10-23T00:00:00.000Z",
      },
    ],
    invitation: [
      {
        id: "inv-1",
        slug: "rika-fauzi",
        theme: "classic-rose",
        variant: "classic-rose",
        weddingDate: "2025-09-07T01:00:00.000Z",
        heroAssetId: "med-1",
        galleryVideoUrl: null,
        musicAssetId: null,
        ownerId: "usr-1",
        createdAt: "2026-10-23T00:00:00.000Z",
        updatedAt: "2026-10-23T00:00:00.000Z",
      },
    ],
    invitationSections: [
      {
        id: "sec-1",
        invitationId: "inv-1",
        couple: true,
        events: true,
        gallery: true,
        loveStory: true,
        gifts: true,
        wishes: true,
      },
    ],
    partner: [
      {
        id: "prt-1",
        invitationId: "inv-1",
        role: "GROOM",
        name: "Fauzi",
        parents: "Bapak & Ibu",
        instagram: "@fauzi",
        photoAssetId: "med-1",
      },
    ],
    event: [
      {
        id: "evt-1",
        invitationId: "inv-1",
        name: "Akad Nikah",
        displayDate: "Minggu, 07 September 2025",
        displayTime: "08:00 - 10:00 WIB",
        location: "Masjid Raya",
        address: "Jl. Raya No. 1",
        mapUrl: "https://maps.google.com",
        position: 0,
      },
    ],
    galleryItem: [
      {
        id: "gal-1",
        invitationId: "inv-1",
        assetId: "med-1",
        altText: "Foto 1",
        position: 0,
      },
    ],
    loveStory: [
      {
        id: "lov-1",
        invitationId: "inv-1",
        title: "Pertama Bertemu",
        content: "Di kampus pada tahun 2020",
        position: 0,
      },
    ],
    giftAccount: [
      {
        id: "gft-1",
        invitationId: "inv-1",
        platform: "BCA",
        accountHolder: "Fauzi",
        accountNumber: "1234567890",
        logoPath: "/images/banks/bca.png",
        position: 0,
      },
    ],
  };
}

describe("Snapshot Digest Sensitivity & Determinism (SEED-08)", () => {
  it("produces identical SHA-256 digest for semantically identical snapshots", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();

    const digestA = computeSnapshotDigest(snapA);
    const digestB = computeSnapshotDigest(snapB);

    expect(digestA).toHaveLength(64);
    expect(digestA).toBe(digestB);
  });

  it("produces identical SHA-256 digest when table keys or object properties are defined in different order", () => {
    const snapA = createMockSnapshot();
    // Construct snapshot with scrambled top-level key order
    const snapB = {
      giftAccount: snapA.giftAccount,
      loveStory: snapA.loveStory,
      galleryItem: snapA.galleryItem,
      event: snapA.event,
      partner: snapA.partner,
      invitationSections: snapA.invitationSections,
      invitation: snapA.invitation,
      mediaAsset: snapA.mediaAsset,
      user: [
        // Scramble row key order
        {
          updatedAt: snapA.user[0].updatedAt,
          role: snapA.user[0].role,
          name: snapA.user[0].name,
          lockedUntil: snapA.user[0].lockedUntil,
          isActive: snapA.user[0].isActive,
          id: snapA.user[0].id,
          failedLoginCount: snapA.user[0].failedLoginCount,
          email: snapA.user[0].email,
          createdAt: snapA.user[0].createdAt,
        },
      ],
    } as DatabaseSnapshot;

    expect(computeSnapshotDigest(snapA)).toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested user.id changes with identical row counts", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.user[0].id = "usr-tampered-id";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested user.name changes with identical row counts", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.user[0].name = "Tampered Admin";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested user.updatedAt timestamp changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.user[0].updatedAt = "2026-10-23T00:00:01.000Z";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested mediaAsset.bytes changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.mediaAsset[0].bytes = 39976;

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested invitation.weddingDate changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.invitation[0].weddingDate = "2025-09-07T02:00:00.000Z";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested partner.photoAssetId foreign key changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.partner[0].photoAssetId = "med-other";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested event.displayTime changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.event[0].displayTime = "09:00 - 11:00 WIB";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });

  it("changes digest when nested giftAccount.accountNumber changes", () => {
    const snapA = createMockSnapshot();
    const snapB = createMockSnapshot();
    snapB.giftAccount[0].accountNumber = "9999999999";

    expect(computeSnapshotDigest(snapA)).not.toBe(computeSnapshotDigest(snapB));
  });
});
