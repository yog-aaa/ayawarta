"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save } from "lucide-react";
import {
  createInvitationDraftAction,
  saveInvitationDraftAction,
} from "@/app/admin/actions";
import type { AdminDraftDto } from "@/features/admin/draft-service";
import type { DraftFieldErrors, DraftPayloadV1 } from "@/features/admin/draft-schema";
import { AdminDraftFormFields, type AdminEditorMediaChoice } from "./AdminDraftFormFields";

type SaveState = "idle" | "saving" | "saved" | "error";

function fieldTarget(path: string): string {
  let target = "form";
  if (path === "meta" || path === "meta.theme" || path === "meta.variant") target = path === "meta" ? "identity" : path;
  else if (["slug", "weddingDate", "heroAssetId", "galleryVideoUrl", "musicAssetId", "greeting", "prayer"].includes(path)) target = path;
  else if (/^partners\.(groom|bride)\.(name|parents|instagram|photoAssetId)$/.test(path)) target = path;
  else if (/^events\.\d+\.(name|displayDate|displayTime|location|address|mapUrl)$/.test(path)) target = path;
  else if (/^galleryItems\.\d+\.(assetId|altText|caption)$/.test(path)) target = path;
  else if (/^loveStories\.\d+\.(title|content)$/.test(path)) target = path;
  else if (/^giftAccounts\.\d+\.(platform|accountHolder|accountNumber|logoPath)$/.test(path)) target = path;
  else if (/^partners\./.test(path)) target = "partners";
  else if (/^events/.test(path)) target = "events";
  else if (/^galleryItems/.test(path)) target = "galleryItems";
  else if (/^loveStories/.test(path)) target = "loveStories";
  else if (/^giftAccounts/.test(path)) target = "giftAccounts";
  else if (/^sections/.test(path)) target = "sections";
  return `draft-${target.replace(/[^a-z0-9-]/gi, "-")}`;
}

function fieldLabel(path: string): string {
  const labels: Record<string, string> = {
    slug: "Slug undangan", meta: "Tema", "meta.theme": "Tema", weddingDate: "Tanggal pernikahan",
    heroAssetId: "Foto sampul", galleryVideoUrl: "Tautan video", events: "Acara",
    galleryItems: "Galeri", loveStories: "Kisah kami", giftAccounts: "Rekening hadiah",
  };
  if (labels[path]) return labels[path];
  const row = /^(events|galleryItems|loveStories|giftAccounts)\.(\d+)\.(.+)$/.exec(path);
  if (row) {
    const group = { events: "Acara", galleryItems: "Foto galeri", loveStories: "Cerita", giftAccounts: "Rekening" }[row[1]];
    return `${group} ${Number(row[2]) + 1} · ${row[3]}`;
  }
  return path;
}

function savedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Tersimpan";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date) + " WIB";
}

export function AdminDraftEditor({
  initialPayload,
  initialDraft = null,
  mediaChoices,
}: {
  initialPayload: DraftPayloadV1;
  initialDraft?: AdminDraftDto | null;
  mediaChoices: readonly AdminEditorMediaChoice[];
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialPayload);
  const [savedPayload, setSavedPayload] = useState(() => JSON.stringify(initialPayload));
  const [draft, setDraft] = useState(initialDraft);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<DraftFieldErrors>({});
  const dirty = JSON.stringify(payload) !== savedPayload;
  const dirtyRef = useRef(dirty);
  const historyArmedRef = useRef(false);
  const leavingByHistoryRef = useRef(false);
  const saving = state === "saving";
  const errorEntries = Object.entries(fieldErrors);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const warnOnInternalLink = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || new URL(link.href).origin !== location.origin) return;
      if (new URL(link.href).pathname === location.pathname && new URL(link.href).search === location.search) return;
      if (!window.confirm("Perubahan draf belum disimpan. Tinggalkan halaman ini?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnOnInternalLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnOnInternalLink, true);
    };
  }, [dirty]);

  useEffect(() => {
    const marker = "__ayawartaDraftGuard";
    const currentState = window.history.state as Record<string, unknown> | null;
    historyArmedRef.current = currentState?.[marker] === window.location.pathname;
    const handleBack = () => {
      if (!historyArmedRef.current || leavingByHistoryRef.current) return;
      historyArmedRef.current = false;
      if (dirtyRef.current && !window.confirm("Perubahan draf belum disimpan. Tinggalkan halaman ini?")) {
        const state = window.history.state;
        window.history.pushState({ ...(state && typeof state === "object" ? state : {}), [marker]: window.location.pathname }, "", window.location.href);
        historyArmedRef.current = true;
        return;
      }
      leavingByHistoryRef.current = true;
      window.setTimeout(() => window.history.back(), 0);
    };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, []);

  useEffect(() => {
    if (!dirty || historyArmedRef.current || leavingByHistoryRef.current) return;
    const state = window.history.state;
    window.history.pushState({ ...(state && typeof state === "object" ? state : {}), __ayawartaDraftGuard: window.location.pathname }, "", window.location.href);
    historyArmedRef.current = true;
  }, [dirty]);

  const updatePayload = (next: DraftPayloadV1) => {
    setPayload(next);
    setFieldErrors({});
    setMessage("");
    if (state !== "idle") setState("idle");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setState("saving");
    setMessage("");
    setFieldErrors({});
    try {
      const result = draft
        ? await saveInvitationDraftAction({ id: draft.id, expectedDraftVersion: draft.draftVersion, payload })
        : await createInvitationDraftAction(payload);
      if (!result.ok) {
        setState("error");
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        if (result.code === "unauthorized" || result.code === "forbidden") router.replace("/admin/login");
        return;
      }
      setDraft(result.data);
      setPayload(result.data.payload);
      setSavedPayload(JSON.stringify(result.data.payload));
      setFieldErrors({});
      setState("saved");
      if (!draft) router.replace(`/admin/invitations/${encodeURIComponent(result.data.id)}/edit`);
    } catch {
      setState("error");
      setMessage("Draf belum dapat disimpan. Perubahan Anda tetap ada; coba lagi.");
    }
  };

  const previewHref = draft ? `/admin/invitations/${encodeURIComponent(draft.id)}/preview` : null;

  return (
    <div id="draft-form" className="min-w-0">
      <Link href="/admin/invitations" className="focus-ring mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-soft">
        <ArrowLeft size={17} aria-hidden="true" /> Kembali ke undangan
      </Link>

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-primary">Ruang penyuntingan privat</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl">
            {draft ? "Sunting draf undangan" : "Buat draf undangan"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Simpan pekerjaan Anda untuk melihat pratinjau. Halaman publik tidak berubah saat draf disimpan.
          </p>
        </div>
        <span className="rounded-full border border-brand-primary/20 bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-brand-primary">Draf privat</span>
      </div>

      <div aria-live="polite" className="mb-6 rounded-2xl border border-brand-secondary/10 bg-white px-5 py-4 text-sm shadow-subtle">
        <p className={`font-semibold ${dirty ? "text-amber-800" : "text-brand-secondary"}`}>
          {saving ? "Menyimpan draf…" : dirty ? "Perubahan belum disimpan" : draft ? "Semua perubahan tersimpan" : "Draf belum dibuat"}
        </p>
        {draft && <p className="mt-1 text-xs text-muted-foreground">Terakhir disimpan {savedLabel(draft.updatedAt)} · versi draf {draft.draftVersion}</p>}
        {payload.meta?.theme === "siger-priangan" && <p className="mt-2 text-xs leading-5 text-muted-foreground">Siger Priangan dapat disimpan dan dipratinjau; penerbitannya belum tersedia.</p>}
      </div>

      {state === "error" && (
        <div role="alert" className="mb-6 rounded-2xl border border-destructive/20 bg-red-50 p-5 text-sm text-destructive">
          <p className="font-semibold">{message}</p>
          {errorEntries.length > 0 && (
            <div className="mt-3">
              <p>Periksa kolom berikut:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errorEntries.map(([path, messages]) => (
                  <li key={path}>
                    <a href={`#${fieldTarget(path)}`} className="focus-ring underline underline-offset-2">{fieldLabel(path)}: {messages.join(" ")}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={save} noValidate>
        <AdminDraftFormFields
          payload={payload}
          onChange={updatePayload}
          errors={fieldErrors}
          mediaChoices={mediaChoices}
          slugLocked={Boolean(draft?.invitationId)}
          disabled={saving}
        />
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-brand-secondary/10 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(13,40,91,0.06)] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <p className="text-xs text-muted-foreground">{dirty ? "Simpan sebelum membuka pratinjau." : "Pratinjau hanya menampilkan draf yang tersimpan."}</p>
          <div className="flex flex-wrap items-center gap-2">
            {previewHref && !dirty && (
              <Link href={previewHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-secondary/15 px-4 text-sm font-semibold text-brand-secondary hover:bg-brand-soft">
                <Eye size={17} aria-hidden="true" /> Pratinjau draf
              </Link>
            )}
            <button type="submit" disabled={saving || (Boolean(draft) && !dirty)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={17} aria-hidden="true" /> {saving ? "Menyimpan…" : "Simpan draf"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
