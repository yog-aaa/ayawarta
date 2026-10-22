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

export type InvitationTheme = "classic-rose";

export type ClassicRoseVariant =
  | "red"
  | "green"
  | "blue"
  | "orange"
  | "black"
  | "white";

export type InvitationVariant = ClassicRoseVariant;

export type InvitationMeta = {
  theme: InvitationTheme;
  variant: InvitationVariant;
};

export type InvitationData = {
  sections: InvitationSectionsConfig;
  couple: Couple;
  weddingDate: Date;
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
