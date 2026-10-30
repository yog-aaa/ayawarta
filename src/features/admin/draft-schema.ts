import { z } from "zod";

import type { InvitationTheme } from "@/features/invitations/types";

const text = (limit: number) => z.string().max(limit);
const assetId = z.string().min(1).max(120).nullable();
const rowKey = z.string().min(1).max(120);

export const invitationMetaSchema = z.discriminatedUnion("theme", [
  z.object({
    theme: z.literal("classic-rose"),
    variant: z.enum(["red", "green", "blue", "orange", "black", "white"]),
  }),
  z.object({ theme: z.literal("siger-priangan"), variant: z.literal("ivory") }),
]);

const sectionsSchema = z.object({
  couple: z.boolean(),
  events: z.boolean(),
  gallery: z.boolean(),
  loveStory: z.boolean(),
  gifts: z.boolean(),
  wishes: z.boolean(),
});

const partnerSchema = z.object({
  name: text(160),
  parents: text(500),
  instagram: text(120),
  photoAssetId: assetId,
});

const keyed = z.object({ key: rowKey });

export const draftPayloadV1Schema = z.object({
  schemaVersion: z.literal(1),
  slug: text(80),
  meta: invitationMetaSchema.nullable(),
  weddingDate: z.iso.datetime({ offset: true }).nullable(),
  sections: sectionsSchema,
  greeting: text(2_000),
  prayer: text(2_000),
  heroAssetId: assetId,
  musicAssetId: assetId,
  galleryVideoUrl: text(2_000),
  partners: z.object({ groom: partnerSchema, bride: partnerSchema }),
  events: z.array(keyed.extend({
    name: text(160),
    displayDate: text(160),
    displayTime: text(160),
    location: text(300),
    address: text(800),
    mapUrl: text(2_000),
  })).max(12),
  galleryItems: z.array(keyed.extend({
    assetId,
    altText: text(300),
    caption: text(500),
  })).max(60),
  loveStories: z.array(keyed.extend({
    title: text(160),
    content: text(5_000),
  })).max(30),
  giftAccounts: z.array(keyed.extend({
    platform: text(160),
    accountHolder: text(160),
    accountNumber: text(160),
    logoPath: text(500),
  })).max(20),
}).strict();

export type DraftPayloadV1 = z.infer<typeof draftPayloadV1Schema>;
export type DraftFieldErrors = Record<string, string[]>;

export interface PublishDraftContext {
  existingPublishedSlug?: string;
  allowedMediaAssetIds?: ReadonlySet<string>;
  enabledThemes?: readonly InvitationTheme[];
}

function nonempty(value: string): boolean {
  return value.trim().length > 0;
}

function validHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function addError(errors: DraftFieldErrors, field: string, message: string): void {
  (errors[field] ??= []).push(message);
}

function collectSchemaErrors(error: z.ZodError): DraftFieldErrors {
  const errors: DraftFieldErrors = {};
  for (const issue of error.issues) {
    addError(errors, issue.path.join(".") || "form", issue.message);
  }
  return errors;
}

function checkUniqueKeys(
  errors: DraftFieldErrors,
  name: "events" | "galleryItems" | "loveStories" | "giftAccounts",
  items: ReadonlyArray<{ key: string }>
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.key)) addError(errors, `${name}.${index}.key`, "Kunci baris harus unik.");
    seen.add(item.key);
  });
}

/** Structural validation allows incomplete content, but never invalid theme pairs or duplicate row keys. */
export function parseDraftForSave(input: unknown):
  | { ok: true; payload: DraftPayloadV1 }
  | { ok: false; fieldErrors: DraftFieldErrors } {
  const parsed = draftPayloadV1Schema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: collectSchemaErrors(parsed.error) };

  const errors: DraftFieldErrors = {};
  checkUniqueKeys(errors, "events", parsed.data.events);
  checkUniqueKeys(errors, "galleryItems", parsed.data.galleryItems);
  checkUniqueKeys(errors, "loveStories", parsed.data.loveStories);
  checkUniqueKeys(errors, "giftAccounts", parsed.data.giftAccounts);
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, payload: parsed.data };
}

/** Complete content validation for a future explicit publish action. Media identity is checked with scoped IDs. */
export function validateDraftForPublish(input: unknown, context: PublishDraftContext = {}):
  | { ok: true; payload: DraftPayloadV1 }
  | { ok: false; fieldErrors: DraftFieldErrors } {
  const saved = parseDraftForSave(input);
  if (!saved.ok) return saved;

  const payload = saved.payload;
  const errors: DraftFieldErrors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) {
    addError(errors, "slug", "Slug harus memakai huruf kecil, angka, dan tanda hubung.");
  }
  if (context.existingPublishedSlug !== undefined && payload.slug !== context.existingPublishedSlug) {
    addError(errors, "slug", "Slug undangan yang sudah terbit tidak dapat diubah.");
  }
  if (!payload.meta) {
    addError(errors, "meta", "Pilih tema undangan.");
  } else if (!(context.enabledThemes ?? ["classic-rose"]).includes(payload.meta.theme)) {
    addError(errors, "meta.theme", "Tema ini belum tersedia untuk diterbitkan.");
  }
  if (!payload.weddingDate) addError(errors, "weddingDate", "Tanggal pernikahan wajib diisi.");

  const allowed = context.allowedMediaAssetIds;
  const checkAsset = (id: string | null, field: string, required: boolean): void => {
    if (!id) {
      if (required) addError(errors, field, "Pilih media yang terverifikasi.");
    } else if (!allowed?.has(id)) {
      addError(errors, field, "Media tidak tersedia untuk undangan ini.");
    }
  };
  checkAsset(payload.heroAssetId, "heroAssetId", true);
  checkAsset(payload.partners.groom.photoAssetId, "partners.groom.photoAssetId", true);
  checkAsset(payload.partners.bride.photoAssetId, "partners.bride.photoAssetId", true);
  checkAsset(payload.musicAssetId, "musicAssetId", false);

  for (const role of ["groom", "bride"] as const) {
    if (!nonempty(payload.partners[role].name)) addError(errors, `partners.${role}.name`, "Nama mempelai wajib diisi.");
  }
  if (payload.sections.events && payload.events.length === 0) addError(errors, "events", "Tambahkan setidaknya satu acara.");
  payload.events.forEach((event, index) => {
    if (!payload.sections.events) return;
    for (const field of ["name", "displayDate", "displayTime", "address"] as const) {
      if (!nonempty(event[field])) addError(errors, `events.${index}.${field}`, "Kolom ini wajib diisi.");
    }
    if (event.mapUrl && !validHttpsUrl(event.mapUrl)) addError(errors, `events.${index}.mapUrl`, "Gunakan URL HTTPS yang valid.");
  });
  if (payload.sections.gallery && payload.galleryItems.length === 0) addError(errors, "galleryItems", "Tambahkan setidaknya satu foto galeri.");
  payload.galleryItems.forEach((item, index) => {
    if (!payload.sections.gallery) return;
    checkAsset(item.assetId, `galleryItems.${index}.assetId`, true);
    if (!nonempty(item.altText)) addError(errors, `galleryItems.${index}.altText`, "Deskripsi foto wajib diisi.");
  });
  if (payload.galleryVideoUrl && !validHttpsUrl(payload.galleryVideoUrl)) addError(errors, "galleryVideoUrl", "Gunakan URL HTTPS yang valid.");
  if (payload.sections.loveStory) payload.loveStories.forEach((story, index) => {
    if (!nonempty(story.title)) addError(errors, `loveStories.${index}.title`, "Judul cerita wajib diisi.");
    if (!nonempty(story.content)) addError(errors, `loveStories.${index}.content`, "Isi cerita wajib diisi.");
  });
  if (payload.sections.gifts) payload.giftAccounts.forEach((gift, index) => {
    for (const field of ["platform", "accountHolder", "accountNumber"] as const) {
      if (!nonempty(gift[field])) addError(errors, `giftAccounts.${index}.${field}`, "Kolom ini wajib diisi.");
    }
  });
  return Object.keys(errors).length ? { ok: false, fieldErrors: errors } : { ok: true, payload };
}

/** A saved draft may be previewed with clearly marked empty portrait slots before A5 media provisioning. */
export function validateDraftForPreview(input: unknown, context: PublishDraftContext = {}):
  | { ok: true; payload: DraftPayloadV1; missingMediaFields: string[] }
  | { ok: false; fieldErrors: DraftFieldErrors } {
  const saved = parseDraftForSave(input);
  if (!saved.ok) return saved;
  const validated = validateDraftForPublish(saved.payload, {
    ...context,
    enabledThemes: ["classic-rose", "siger-priangan"],
  });
  if (validated.ok) return { ...validated, missingMediaFields: [] };

  const missingMediaFields: string[] = [];
  const errors = { ...validated.fieldErrors };
  const placeholderFields = [
    ["heroAssetId", saved.payload.heroAssetId],
    ["partners.groom.photoAssetId", saved.payload.partners.groom.photoAssetId],
    ["partners.bride.photoAssetId", saved.payload.partners.bride.photoAssetId],
  ] as const;
  for (const [field, id] of placeholderFields) {
    if (id === null && errors[field]?.every((message) => message === "Pilih media yang terverifikasi.")) {
      missingMediaFields.push(field);
      delete errors[field];
    }
  }
  return Object.keys(errors).length
    ? { ok: false, fieldErrors: errors }
    : { ok: true, payload: saved.payload, missingMediaFields };
}

export function createEmptyDraftPayload(): DraftPayloadV1 {
  return {
    schemaVersion: 1,
    slug: "",
    meta: { theme: "classic-rose", variant: "red" },
    weddingDate: null,
    sections: { couple: true, events: true, gallery: false, loveStory: false, gifts: false, wishes: true },
    greeting: "",
    prayer: "",
    heroAssetId: null,
    musicAssetId: null,
    galleryVideoUrl: "",
    partners: {
      groom: { name: "", parents: "", instagram: "", photoAssetId: null },
      bride: { name: "", parents: "", instagram: "", photoAssetId: null },
    },
    events: [],
    galleryItems: [],
    loveStories: [],
    giftAccounts: [],
  };
}
