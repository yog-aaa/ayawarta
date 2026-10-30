import type {
  ClassicRoseVariant,
  Couple,
  EventItem,
  Gallery,
  GiftAccountItem,
  Invitation,
  InvitationData,
  InvitationMeta,
  InvitationSectionsConfig,
  InvitationTheme,
  LoveStoryItem,
} from "./types";
import type { InvitationDetailPayload, PublicInvitationDetailPayload } from "./query";

type MappableInvitationPayload = InvitationDetailPayload | PublicInvitationDetailPayload;

export class InvitationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationMappingError";
  }
}

const SUPPORTED_THEMES: readonly InvitationTheme[] = ["classic-rose", "siger-priangan"];
const CLASSIC_ROSE_VARIANTS: readonly ClassicRoseVariant[] = [
  "red",
  "green",
  "blue",
  "orange",
  "black",
  "white",
];

export function parseInvitationMeta(theme: string, variant: string): InvitationMeta {
  if (!SUPPORTED_THEMES.includes(theme as InvitationTheme)) {
    throw new InvitationMappingError(
      `Unsupported theme: "${theme}". Supported themes: ${SUPPORTED_THEMES.join(", ")}`
    );
  }

  if (theme === "siger-priangan") {
    if (variant !== "ivory") {
      throw new InvitationMappingError(
        `Unsupported variant: "${variant}" for theme "${theme}". Supported variants: ivory`
      );
    }
    return { theme, variant: "ivory" };
  }

  if (!CLASSIC_ROSE_VARIANTS.includes(variant as ClassicRoseVariant)) {
    throw new InvitationMappingError(
      `Unsupported variant: "${variant}" for theme "${theme}". Supported variants: ${CLASSIC_ROSE_VARIANTS.join(", ")}`
    );
  }

  return { theme: "classic-rose", variant: variant as ClassicRoseVariant };
}

export function mapPrismaToInvitation(
  payload: MappableInvitationPayload
): Invitation {
  const meta = parseInvitationMeta(payload.theme, payload.variant);

  if (!payload.sections) {
    throw new InvitationMappingError(
      "Invitation sections configuration is missing"
    );
  }

  const sections: InvitationSectionsConfig = {
    couple: payload.sections.couple,
    events: payload.sections.events,
    gallery: payload.sections.gallery,
    loveStory: payload.sections.loveStory,
    gifts: payload.sections.gifts,
    wishes: payload.sections.wishes,
  };

  if (!payload.heroAsset?.secureUrl) {
    throw new InvitationMappingError("Hero asset is required but missing");
  }

  const groomPartner = payload.partners?.find((p) => p.role === "GROOM");
  if (!groomPartner) {
    throw new InvitationMappingError("Groom partner is missing");
  }
  if (!groomPartner.photoAsset?.secureUrl) {
    throw new InvitationMappingError("Groom photo asset is missing");
  }

  const bridePartner = payload.partners?.find((p) => p.role === "BRIDE");
  if (!bridePartner) {
    throw new InvitationMappingError("Bride partner is missing");
  }
  if (!bridePartner.photoAsset?.secureUrl) {
    throw new InvitationMappingError("Bride photo asset is missing");
  }

  const couple: Couple = {
    groom: {
      name: groomPartner.name,
      parents: groomPartner.parents,
      instagram: groomPartner.instagram ?? "",
      photo: groomPartner.photoAsset.secureUrl,
    },
    bride: {
      name: bridePartner.name,
      parents: bridePartner.parents,
      instagram: bridePartner.instagram ?? "",
      photo: bridePartner.photoAsset.secureUrl,
    },
    heroImage: payload.heroAsset.secureUrl,
  };

  const sortedEvents = [...(payload.events ?? [])].sort(
    (a, b) => a.position - b.position
  );
  const events: EventItem[] = sortedEvents.map((event) => ({
    name: event.name,
    date: event.displayDate,
    time: event.displayTime,
    location: event.location,
    address: event.address,
    mapLink: event.mapUrl,
  }));

  let gallery: Gallery | undefined;
  if (sections.gallery) {
    const sortedGalleryItems = [...(payload.galleryItems ?? [])].sort(
      (a, b) => a.position - b.position
    );
    const items = sortedGalleryItems.map((item) => {
      if (!item.asset?.secureUrl) {
        throw new InvitationMappingError(
          `Gallery item at position ${item.position} has no asset`
        );
      }
      return {
        url: item.asset.secureUrl,
        altText: item.altText,
        caption: "caption" in item ? item.caption ?? "" : "",
      };
    });

    if (items.length === 0) {
      throw new InvitationMappingError(
        "Gallery section is active but contains no images"
      );
    }

    gallery = {
      videoUrl: payload.galleryVideoUrl ?? "",
      items,
      images: items.map((item) => item.url),
    };
  }

  let loveStory: LoveStoryItem[] | undefined;
  if (sections.loveStory) {
    const sortedLoveStories = [...(payload.loveStories ?? [])].sort(
      (a, b) => a.position - b.position
    );
    loveStory = sortedLoveStories.map((story) => ({
      title: story.title,
      content: story.content,
    }));
  }

  let gifts: GiftAccountItem[] | undefined;
  if (sections.gifts) {
    const sortedGiftAccounts = [...(payload.giftAccounts ?? [])].sort(
      (a, b) => a.position - b.position
    );
    gifts = sortedGiftAccounts.map((account) => ({
      platform: account.platform,
      accountHolder: account.accountHolder,
      accountNumber: String(account.accountNumber),
      logo: account.logoPath,
    }));
  }

  const musicUrl = payload.musicAsset?.secureUrl || undefined;

  return {
    meta,
    data: {
      sections,
      couple,
      weddingDate: payload.weddingDate,
      greeting: "greeting" in payload ? payload.greeting ?? "" : "",
      prayer: "prayer" in payload ? payload.prayer ?? "" : "",
      events,
      ...(gallery !== undefined ? { gallery } : {}),
      ...(loveStory !== undefined ? { loveStory } : {}),
      ...(gifts !== undefined ? { gifts } : {}),
      ...(musicUrl !== undefined ? { musicUrl } : {}),
    },
  };
}

export function mapPrismaToInvitationData(
  payload: MappableInvitationPayload
): InvitationData {
  return mapPrismaToInvitation(payload).data;
}
