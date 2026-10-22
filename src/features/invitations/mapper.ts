import type {
  ClassicRoseVariant,
  Couple,
  EventItem,
  Gallery,
  GiftAccountItem,
  Invitation,
  InvitationData,
  InvitationSectionsConfig,
  InvitationTheme,
  LoveStoryItem,
} from "./types";
import type { InvitationDetailPayload } from "./query";

export class InvitationMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationMappingError";
  }
}

const SUPPORTED_THEMES: readonly InvitationTheme[] = ["classic-rose"];
const SUPPORTED_VARIANTS: readonly ClassicRoseVariant[] = [
  "red",
  "green",
  "blue",
  "orange",
  "black",
  "white",
];

export function mapPrismaToInvitation(
  payload: InvitationDetailPayload
): Invitation {
  if (!SUPPORTED_THEMES.includes(payload.theme as InvitationTheme)) {
    throw new InvitationMappingError(
      `Unsupported theme: "${payload.theme}". Supported themes: ${SUPPORTED_THEMES.join(", ")}`
    );
  }

  if (!SUPPORTED_VARIANTS.includes(payload.variant as ClassicRoseVariant)) {
    throw new InvitationMappingError(
      `Unsupported variant: "${payload.variant}". Supported variants: ${SUPPORTED_VARIANTS.join(", ")}`
    );
  }

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
    const images = sortedGalleryItems.map((item) => {
      if (!item.asset?.secureUrl) {
        throw new InvitationMappingError(
          `Gallery item at position ${item.position} has no asset`
        );
      }
      return item.asset.secureUrl;
    });

    if (images.length === 0) {
      throw new InvitationMappingError(
        "Gallery section is active but contains no images"
      );
    }

    gallery = {
      videoUrl: payload.galleryVideoUrl ?? "",
      images,
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
    meta: {
      theme: payload.theme as InvitationTheme,
      variant: payload.variant as ClassicRoseVariant,
    },
    data: {
      sections,
      couple,
      weddingDate: payload.weddingDate,
      events,
      ...(gallery !== undefined ? { gallery } : {}),
      ...(loveStory !== undefined ? { loveStory } : {}),
      ...(gifts !== undefined ? { gifts } : {}),
      ...(musicUrl !== undefined ? { musicUrl } : {}),
    },
  };
}

export function mapPrismaToInvitationData(
  payload: InvitationDetailPayload
): InvitationData {
  return mapPrismaToInvitation(payload).data;
}
