"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { DraftFieldErrors, DraftPayloadV1 } from "@/features/admin/draft-schema";
import type { ClassicRoseVariant } from "@/features/invitations/types";
import { AdminImageUploader, type ImageUploadOutcome } from "./AdminImageUploader";

export type AdminEditorMediaChoice = {
  id: string;
  url: string;
  resourceType: string;
  width: number | null;
  height: number | null;
  label: string;
  selectable: boolean;
};

export type AdminImageUploadControls = {
  enabled: boolean;
  pendingSlots: ReadonlySet<string>;
  onUpload: (slot: string, file: File, idempotencyKey: string) => Promise<ImageUploadOutcome>;
};

const fieldId = (path: string) => `draft-${path.replace(/[^a-z0-9-]/gi, "-")}`;
const inputClass = "focus-ring min-h-11 w-full rounded-xl border border-brand-secondary/15 bg-white px-3.5 py-2.5 text-sm text-brand-secondary placeholder:text-muted disabled:bg-brand-soft disabled:text-muted-foreground";

function Field({
  path, label, value, onChange, errors, disabled, maxLength, type = "text", placeholder,
  multiline = false, help, readOnly = false,
}: {
  path: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors: DraftFieldErrors;
  disabled?: boolean;
  maxLength?: number;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  help?: string;
  readOnly?: boolean;
}) {
  const id = fieldId(path);
  const error = errors[path]?.join(" ");
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    disabled,
    readOnly,
    maxLength,
    placeholder,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    className: `${inputClass} ${readOnly ? "cursor-not-allowed bg-brand-soft" : ""}`,
  } as const;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-brand-secondary">{label}</label>
      {multiline ? <textarea {...common} rows={3} /> : <input {...common} type={type} />}
      {help && <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">{help}</p>}
      {error && <p id={`${id}-error`} className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function MediaSelect({
  path, label, value, onChange, errors, choices, resourceType, disabled, imageUpload, uploadSlot,
}: {
  path: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  errors: DraftFieldErrors;
  choices: readonly AdminEditorMediaChoice[];
  resourceType: "IMAGE" | "AUDIO";
  disabled?: boolean;
  imageUpload?: AdminImageUploadControls;
  uploadSlot?: string;
}) {
  const id = fieldId(path);
  const error = errors[path]?.join(" ");
  const available = choices.filter((choice) => choice.resourceType === resourceType);
  const selected = available.find((choice) => choice.id === value);

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-brand-secondary">{label}</label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled || available.length === 0}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : `${id}-help`}
        className={inputClass}
      >
        <option value="">{available.length ? "Belum dipilih" : "Belum ada media untuk undangan ini"}</option>
        {available.map((choice) => (
          <option key={choice.id} value={choice.id} disabled={!choice.selectable && choice.id !== value}>
            {choice.label}{!choice.selectable ? " · hanya pemakaian lama" : ""}
            {choice.width && choice.height ? ` · ${choice.width} × ${choice.height}` : ""}
          </option>
        ))}
      </select>
      <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">
        {available.length
          ? selected && !selected.selectable
            ? "Media lama ini dipertahankan, tetapi tidak dapat dipilih untuk kolom lain."
            : "Hanya media yang sudah terhubung dengan undangan ini dapat dipilih."
          : uploadSlot ? "Unggah foto untuk undangan ini, lalu pilih media yang terverifikasi." : "Musik baru belum dapat diunggah di editor ini."}
      </p>
      {selected && resourceType === "IMAGE" && (
        <div className="relative h-36 w-36 overflow-hidden rounded-xl border border-brand-secondary/10 bg-brand-soft">
          <Image src={selected.url} alt={`Pratinjau ${label.toLowerCase()}`} fill sizes="144px" className="object-cover" />
        </div>
      )}
      {imageUpload && uploadSlot && <AdminImageUploader slot={uploadSlot} label={label} disabled={!imageUpload.enabled || Boolean(disabled)} hasPending={imageUpload.pendingSlots.has(uploadSlot)} onUpload={imageUpload.onUpload} />}
      {error && <p id={`${id}-error`} className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Group({ id, eyebrow, title, description, children, error }: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <section id={fieldId(id)} tabIndex={-1} aria-labelledby={`${fieldId(id)}-title`} className="scroll-mt-24 rounded-[1.5rem] border border-brand-secondary/10 bg-white p-5 shadow-subtle sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary">{eyebrow}</p>
      <h2 id={`${fieldId(id)}-title`} className="mt-2 text-xl font-bold text-brand-secondary sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function OrderedRows<T extends { key: string }>({
  title, items, limit, onAdd, onRemove, onMove, render,
}: {
  title: string;
  items: readonly T[];
  limit: number;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, offset: -1 | 1) => void;
  render: (item: T, index: number) => ReactNode;
}) {
  const addRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-brand-secondary/20 bg-brand-soft p-4 text-sm text-muted-foreground">Belum ada {title.toLowerCase()}.</p>}
      {items.map((item, index) => (
        <div key={item.key} className="rounded-2xl border border-brand-secondary/10 bg-[#fbfcff] p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-brand-secondary">{title} {index + 1}</h3>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Naikkan ${title.toLowerCase()} ${index + 1}`} className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-brand-secondary hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35">
                <ArrowUp size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onMove(index, 1)} disabled={index === items.length - 1} aria-label={`Turunkan ${title.toLowerCase()} ${index + 1}`} className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-brand-secondary hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-35">
                <ArrowDown size={17} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => {
                onRemove(index);
                window.setTimeout(() => addRef.current?.focus(), 0);
              }} aria-label={`Hapus ${title.toLowerCase()} ${index + 1}`} className="focus-ring flex h-11 w-11 items-center justify-center rounded-lg text-destructive hover:bg-red-50">
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">{render(item, index)}</div>
        </div>
      ))}
      <button ref={addRef} type="button" onClick={onAdd} disabled={items.length >= limit} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-primary/25 bg-brand-soft px-4 text-sm font-semibold text-brand-primary hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
        <Plus size={17} aria-hidden="true" /> Tambah {title.toLowerCase()}
      </button>
      <p className="text-xs text-muted-foreground">{items.length} dari maksimal {limit} item</p>
    </div>
  );
}

function jakartaDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function AdminDraftFormFields({ payload, onChange, errors, mediaChoices, slugLocked, disabled, imageUpload }: {
  payload: DraftPayloadV1;
  onChange: (payload: DraftPayloadV1) => void;
  errors: DraftFieldErrors;
  mediaChoices: readonly AdminEditorMediaChoice[];
  slugLocked: boolean;
  disabled: boolean;
  imageUpload?: AdminImageUploadControls;
}) {
  const update = (change: (next: DraftPayloadV1) => void) => {
    const next = structuredClone(payload);
    change(next);
    onChange(next);
  };
  const newKey = () => crypto.randomUUID();
  const move = <T extends { key: string }>(items: T[], index: number, offset: -1 | 1): T[] => {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return next;
  };

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-6 disabled:opacity-80">
      <legend className="sr-only">Isi draf undangan</legend>
      <Group id="identity" eyebrow="01 / Dasar" title="Identitas dan tema" description="Slug undangan yang sudah terbit tidak dapat diubah. Menyimpan draf tidak mengubah halaman publik." error={errors.meta?.join(" ")}>
        <div className="grid gap-5 md:grid-cols-2">
          <Field path="slug" label="Slug undangan" value={payload.slug} onChange={(value) => update((next) => { next.slug = value; })} errors={errors} maxLength={80} readOnly={slugLocked} help={slugLocked ? "Tautan publik ini tetap sama setelah undangan terbit." : "Gunakan huruf kecil, angka, dan tanda hubung untuk tautan publik nanti."} />
          <Field path="weddingDate" label="Tanggal dan waktu pernikahan (WIB)" type="datetime-local" value={jakartaDateTime(payload.weddingDate)} onChange={(value) => update((next) => { next.weddingDate = value ? `${value}:00+07:00` : null; })} errors={errors} />
          <div className="min-w-0 space-y-2">
            <label htmlFor={fieldId("meta.theme")} className="block text-sm font-semibold text-brand-secondary">Tema</label>
            <select id={fieldId("meta.theme")} value={payload.meta?.theme ?? ""} onChange={(event) => update((next) => { next.meta = event.target.value === "classic-rose" ? { theme: "classic-rose", variant: "red" } : event.target.value === "siger-priangan" ? { theme: "siger-priangan", variant: "ivory" } : null; })} aria-invalid={Boolean(errors["meta.theme"])} aria-describedby={errors["meta.theme"] ? `${fieldId("meta.theme")}-error` : undefined} className={inputClass}>
              <option value="">Pilih tema</option>
              <option value="classic-rose">Classic Rose</option>
              <option value="siger-priangan">Siger Priangan</option>
            </select>
            {errors["meta.theme"] && <p id={`${fieldId("meta.theme")}-error`} className="text-xs text-destructive">{errors["meta.theme"].join(" ")}</p>}
          </div>
          <div className="min-w-0 space-y-2">
            <label htmlFor={fieldId("meta.variant")} className="block text-sm font-semibold text-brand-secondary">Varian</label>
            <select id={fieldId("meta.variant")} value={payload.meta?.variant ?? ""} disabled={!payload.meta} onChange={(event) => update((next) => { if (next.meta?.theme === "classic-rose") next.meta = { theme: "classic-rose", variant: event.target.value as ClassicRoseVariant }; })} className={inputClass}>
              {!payload.meta && <option value="">Pilih tema terlebih dahulu</option>}
              {payload.meta?.theme === "siger-priangan" && <option value="ivory">Ivory</option>}
              {payload.meta?.theme === "classic-rose" && (["red", "green", "blue", "orange", "black", "white"] as const).map((variant) => <option key={variant} value={variant}>{variant}</option>)}
            </select>
          </div>
        </div>
        <MediaSelect path="heroAssetId" label="Foto sampul" value={payload.heroAssetId} onChange={(value) => update((next) => { next.heroAssetId = value; })} errors={errors} choices={mediaChoices} resourceType="IMAGE" imageUpload={imageUpload} uploadSlot={imageUpload ? "hero" : undefined} />
      </Group>

      <Group id="partners" eyebrow="02 / Mempelai" title="Cerita pasangan">
        {(["groom", "bride"] as const).map((role) => <div key={role} className="rounded-2xl border border-brand-secondary/10 bg-[#fbfcff] p-4 sm:p-5">
          <h3 className="mb-5 text-base font-bold text-brand-secondary">{role === "groom" ? "Mempelai pria" : "Mempelai wanita"}</h3>
          <div className="grid gap-5 md:grid-cols-2">
            <Field path={`partners.${role}.name`} label="Nama" value={payload.partners[role].name} onChange={(value) => update((next) => { next.partners[role].name = value; })} errors={errors} maxLength={160} />
            <Field path={`partners.${role}.instagram`} label="Nama pengguna Instagram" value={payload.partners[role].instagram} onChange={(value) => update((next) => { next.partners[role].instagram = value; })} errors={errors} maxLength={120} placeholder="tanpa @" />
            <Field path={`partners.${role}.parents`} label="Keterangan orang tua" value={payload.partners[role].parents} onChange={(value) => update((next) => { next.partners[role].parents = value; })} errors={errors} maxLength={500} multiline />
            <MediaSelect path={`partners.${role}.photoAssetId`} label="Foto mempelai" value={payload.partners[role].photoAssetId} onChange={(value) => update((next) => { next.partners[role].photoAssetId = value; })} errors={errors} choices={mediaChoices} resourceType="IMAGE" imageUpload={imageUpload} uploadSlot={imageUpload ? role : undefined} />
          </div>
        </div>)}
      </Group>

      <Group id="events" eyebrow="03 / Agenda" title="Acara" description="Urutan di sini menentukan urutan acara di undangan." error={errors.events?.join(" ")}>
        <OrderedRows title="Acara" items={payload.events} limit={12} onAdd={() => update((next) => { next.events.push({ key: newKey(), name: "", displayDate: "", displayTime: "", location: "", address: "", mapUrl: "" }); })} onRemove={(index) => update((next) => { next.events.splice(index, 1); })} onMove={(index, offset) => update((next) => { next.events = move(next.events, index, offset); })} render={(_item, index) => <>
          <Field path={`events.${index}.name`} label="Nama acara" value={payload.events[index].name} onChange={(value) => update((next) => { next.events[index].name = value; })} errors={errors} maxLength={160} />
          <Field path={`events.${index}.displayDate`} label="Tanggal yang tampil" value={payload.events[index].displayDate} onChange={(value) => update((next) => { next.events[index].displayDate = value; })} errors={errors} maxLength={160} />
          <Field path={`events.${index}.displayTime`} label="Waktu yang tampil" value={payload.events[index].displayTime} onChange={(value) => update((next) => { next.events[index].displayTime = value; })} errors={errors} maxLength={160} />
          <Field path={`events.${index}.location`} label="Tempat" value={payload.events[index].location} onChange={(value) => update((next) => { next.events[index].location = value; })} errors={errors} maxLength={300} />
          <Field path={`events.${index}.address`} label="Alamat" value={payload.events[index].address} onChange={(value) => update((next) => { next.events[index].address = value; })} errors={errors} maxLength={800} multiline />
          <Field path={`events.${index}.mapUrl`} label="Tautan peta HTTPS" value={payload.events[index].mapUrl} onChange={(value) => update((next) => { next.events[index].mapUrl = value; })} errors={errors} maxLength={2000} type="url" />
        </>} />
      </Group>

      <Group id="galleryItems" eyebrow="04 / Media" title="Galeri dan video" error={errors.galleryItems?.join(" ")}>
        <Field path="galleryVideoUrl" label="Tautan video HTTPS (opsional)" value={payload.galleryVideoUrl} onChange={(value) => update((next) => { next.galleryVideoUrl = value; })} errors={errors} maxLength={2000} type="url" />
        <OrderedRows title="Foto galeri" items={payload.galleryItems} limit={60} onAdd={() => update((next) => { next.galleryItems.push({ key: newKey(), assetId: null, altText: "", caption: "" }); })} onRemove={(index) => update((next) => { next.galleryItems.splice(index, 1); })} onMove={(index, offset) => update((next) => { next.galleryItems = move(next.galleryItems, index, offset); })} render={(_item, index) => <>
          <MediaSelect path={`galleryItems.${index}.assetId`} label="Foto" value={payload.galleryItems[index].assetId} onChange={(value) => update((next) => { next.galleryItems[index].assetId = value; })} errors={errors} choices={mediaChoices} resourceType="IMAGE" imageUpload={imageUpload} uploadSlot={imageUpload ? `gallery:${payload.galleryItems[index].key}` : undefined} />
          <Field path={`galleryItems.${index}.altText`} label="Deskripsi foto" value={payload.galleryItems[index].altText} onChange={(value) => update((next) => { next.galleryItems[index].altText = value; })} errors={errors} maxLength={300} help="Jelaskan isi foto untuk pembaca layar." />
          <Field path={`galleryItems.${index}.caption`} label="Keterangan (opsional)" value={payload.galleryItems[index].caption} onChange={(value) => update((next) => { next.galleryItems[index].caption = value; })} errors={errors} maxLength={500} />
        </>} />
      </Group>

      <Group id="loveStories" eyebrow="05 / Narasi" title="Kisah kami" error={errors.loveStories?.join(" ")}>
        <OrderedRows title="Cerita" items={payload.loveStories} limit={30} onAdd={() => update((next) => { next.loveStories.push({ key: newKey(), title: "", content: "" }); })} onRemove={(index) => update((next) => { next.loveStories.splice(index, 1); })} onMove={(index, offset) => update((next) => { next.loveStories = move(next.loveStories, index, offset); })} render={(_item, index) => <>
          <Field path={`loveStories.${index}.title`} label="Judul" value={payload.loveStories[index].title} onChange={(value) => update((next) => { next.loveStories[index].title = value; })} errors={errors} maxLength={160} />
          <Field path={`loveStories.${index}.content`} label="Isi cerita" value={payload.loveStories[index].content} onChange={(value) => update((next) => { next.loveStories[index].content = value; })} errors={errors} maxLength={5000} multiline />
        </>} />
      </Group>

      <Group id="giftAccounts" eyebrow="06 / Hadiah" title="Rekening hadiah" error={errors.giftAccounts?.join(" ")}>
        <OrderedRows title="Rekening" items={payload.giftAccounts} limit={20} onAdd={() => update((next) => { next.giftAccounts.push({ key: newKey(), platform: "", accountHolder: "", accountNumber: "", logoPath: "" }); })} onRemove={(index) => update((next) => { next.giftAccounts.splice(index, 1); })} onMove={(index, offset) => update((next) => { next.giftAccounts = move(next.giftAccounts, index, offset); })} render={(_item, index) => <>
          <Field path={`giftAccounts.${index}.platform`} label="Bank atau platform" value={payload.giftAccounts[index].platform} onChange={(value) => update((next) => { next.giftAccounts[index].platform = value; })} errors={errors} maxLength={160} />
          <Field path={`giftAccounts.${index}.accountHolder`} label="Atas nama" value={payload.giftAccounts[index].accountHolder} onChange={(value) => update((next) => { next.giftAccounts[index].accountHolder = value; })} errors={errors} maxLength={160} />
          <Field path={`giftAccounts.${index}.accountNumber`} label="Nomor rekening" value={payload.giftAccounts[index].accountNumber} onChange={(value) => update((next) => { next.giftAccounts[index].accountNumber = value; })} errors={errors} maxLength={160} />
          <Field path={`giftAccounts.${index}.logoPath`} label="Path logo lokal (opsional)" value={payload.giftAccounts[index].logoPath} onChange={(value) => update((next) => { next.giftAccounts[index].logoPath = value; })} errors={errors} maxLength={500} help="Contoh: /images/payment/bca.png" />
        </>} />
      </Group>

      <Group id="music" eyebrow="07 / Suasana" title="Musik dan ucapan">
        <MediaSelect path="musicAssetId" label="Musik undangan (opsional)" value={payload.musicAssetId} onChange={(value) => update((next) => { next.musicAssetId = value; })} errors={errors} choices={mediaChoices} resourceType="AUDIO" />
        <Field path="greeting" label="Kalimat pembuka (opsional)" value={payload.greeting} onChange={(value) => update((next) => { next.greeting = value; })} errors={errors} maxLength={2000} multiline />
        <Field path="prayer" label="Doa atau pesan (opsional)" value={payload.prayer} onChange={(value) => update((next) => { next.prayer = value; })} errors={errors} maxLength={2000} multiline />
      </Group>

      <Group id="sections" eyebrow="08 / Tampilan" title="Bagian yang ditampilkan" description="Nonaktifkan bagian yang belum ingin ditampilkan dalam draf.">
        <div className="grid gap-3 sm:grid-cols-2">
          {([ ["couple", "Pasangan"], ["events", "Acara"], ["gallery", "Galeri"], ["loveStory", "Kisah kami"], ["gifts", "Hadiah"], ["wishes", "Ucapan dan RSVP"] ] as const).map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-secondary/10 bg-[#fbfcff] px-4 py-3 text-sm font-semibold text-brand-secondary">
              <input type="checkbox" checked={payload.sections[key]} onChange={(event) => update((next) => { next.sections[key] = event.target.checked; })} className="focus-ring h-5 w-5 accent-brand-primary" />
              {label}
            </label>
          ))}
        </div>
      </Group>
    </fieldset>
  );
}
