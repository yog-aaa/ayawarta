export type InvitationSectionsConfig = {
  couple: boolean;
  events: boolean;
  gallery: boolean;
  loveStory: boolean;
  gifts: boolean;
  wishes: boolean;
};

export type Person = {
  name: string;
  parents: string;
  instagram: string;
  photo: string;
};

export type Couple = {
  groom: Person;
  bride: Person;
  heroImage: string;
};

export type EventItem = {
  name: string;
  date: string;
  time: string;
  location: string;
  address: string;
  mapLink: string;
};

export type Gallery = {
  videoUrl: string;
  images: string[];
  items: Array<{ url: string; altText: string; caption: string }>;
};

export type LoveStoryItem = {
  title: string;
  content: string;
};

export type GiftAccountItem = {
  platform: string;
  accountHolder: string;
  accountNumber: string;
  logo: string;
};

export type ClassicRoseVariant =
  | "red"
  | "green"
  | "blue"
  | "orange"
  | "black"
  | "white";

export type InvitationMeta =
  | { theme: "classic-rose"; variant: ClassicRoseVariant }
  | { theme: "siger-priangan"; variant: "ivory" };

export type InvitationTheme = InvitationMeta["theme"];
export type InvitationVariant = InvitationMeta["variant"];

export type InvitationData = {
  sections: InvitationSectionsConfig;
  couple: Couple;
  weddingDate: Date;
  greeting?: string;
  prayer?: string;
  events: EventItem[];
  gallery?: Gallery;
  loveStory?: LoveStoryItem[];
  gifts?: GiftAccountItem[];
  musicUrl?: string;
};

export type Invitation = {
  meta: InvitationMeta;
  data: InvitationData;
};
