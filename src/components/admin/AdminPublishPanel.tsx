"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ShieldCheck, X } from "lucide-react";
import {
  publishInvitationDraftAction,
  reviewInvitationDraftAction,
} from "@/app/admin/actions";
import type { DraftFieldErrors } from "@/features/admin/draft-schema";

type Review = {
  draftId: string;
  invitationId: string | null;
  slug: string;
  draftVersion: number;
  publishedVersion: number | null;
  changeSummary: string;
  publicPath: string;
};

type Published = { slug: string; version: number; publicPath: string };

export function AdminPublishPanel({
  draftId,
  draftVersion,
  basePublishedVersion,
  disabled,
  onValidationError,
  onPublished,
}: {
  draftId: string;
  draftVersion: number;
  basePublishedVersion: number | null;
  disabled: boolean;
  onValidationError: (message: string, fieldErrors: DraftFieldErrors) => void;
  onPublished: (result: Published) => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reviewButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [published, setPublished] = useState<Published | null>(null);
  const [confirmationSlug, setConfirmationSlug] = useState("");
  const [status, setStatus] = useState<"idle" | "reviewing" | "publishing" | "uncertain">("idle");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const busy = status === "reviewing" || status === "publishing";
  const noContentChanges = review?.changeSummary.trim() === "Tidak ada perubahan konten.";
  const firstPublication = basePublishedVersion === null;

  const reviewSavedDraft = async () => {
    if (disabled || busy || published || status === "uncertain") return;
    setStatus("reviewing");
    setReview(null);
    setError("");
    setConflict(false);
    try {
      const result = await reviewInvitationDraftAction({ id: draftId });
      if (!result.ok) {
        if (result.code === "unauthorized" || result.code === "forbidden") {
          router.replace("/admin/login");
          return;
        }
        setError(result.message);
        setConflict(result.code === "conflict");
        if (result.code === "validation") onValidationError(result.message, result.fieldErrors ?? {});
        return;
      }
      if (result.data.draftId !== draftId || result.data.draftVersion !== draftVersion || result.data.publishedVersion !== basePublishedVersion) {
        setError("Draf atau undangan terbit berubah. Muat ulang editor sebelum meninjau kembali.");
        setConflict(true);
        return;
      }
      setReview(result.data);
    } catch {
      setError("Tinjauan penerbitan belum dapat dimuat. Coba lagi.");
    } finally {
      setStatus("idle");
    }
  };

  const openConfirmation = () => {
    if (!review || disabled || busy || noContentChanges) return;
    setConfirmationSlug("");
    dialogRef.current?.showModal();
    window.setTimeout(() => confirmationRef.current?.focus(), 0);
  };

  const closeConfirmation = () => {
    if (status !== "publishing") dialogRef.current?.close();
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!review || disabled || busy || noContentChanges || confirmationSlug !== review.slug) return;
    setStatus("publishing");
    setError("");
    try {
      const result = await publishInvitationDraftAction({
        id: draftId,
        expectedDraftVersion: review.draftVersion,
        expectedPublishedVersion: review.publishedVersion,
        confirmationSlug,
      });
      dialogRef.current?.close();
      if (!result.ok) {
        if (result.code === "unauthorized" || result.code === "forbidden") {
          router.replace("/admin/login");
          return;
        }
        setReview(null);
        setError(result.message);
        setConflict(result.code === "conflict");
        if (result.code === "validation") onValidationError(result.message, result.fieldErrors ?? {});
        if (result.code === "dependency_failure" && result.committedUnverified === true) {
          setStatus("uncertain");
          return;
        }
        return;
      }
      setReview(null);
      setPublished(result.data);
      onPublished(result.data);
    } catch {
      dialogRef.current?.close();
      setReview(null);
      setError("Status penerbitan belum dapat dipastikan. Periksa halaman undangan sebelum mencoba lagi.");
      setStatus("uncertain");
    } finally {
      setConfirmationSlug("");
      setStatus((current) => current === "uncertain" ? current : "idle");
    }
  };

  return (
    <section aria-labelledby="publish-title" className="mt-8 rounded-[1.5rem] border border-brand-secondary/15 bg-white p-5 shadow-subtle sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary">Penerbitan</p>
          <h2 id="publish-title" className="mt-2 text-xl font-bold text-brand-secondary sm:text-2xl">{firstPublication ? "Terbitkan undangan baru" : "Terbitkan perubahan"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Tinjau draf tersimpan dan alamat publik sebelum menerbitkan. Menyimpan draf saja tidak mengubah undangan tamu.
          </p>
        </div>
        <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary"><ShieldCheck size={24} /></div>
      </div>

      {published ? <div ref={successRef} tabIndex={-1} role="status" aria-live="polite" className="mt-6 rounded-2xl border border-success/25 bg-green-50 p-5 text-sm text-green-900">
        <p className="flex items-center gap-2 font-bold"><Check size={18} aria-hidden="true" /> Undangan berhasil diterbitkan sebagai versi {published.version}.</p>
        <p className="mt-2">Versi terbaru tersedia bagi tamu. Draf tetap tersimpan; buka kembali undangan dari daftar untuk melanjutkan penyuntingan.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={published.publicPath} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 font-semibold text-white hover:bg-brand-primary-hover">Lihat undangan publik <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/admin/invitations" className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-green-900/20 px-4 font-semibold">Kembali ke daftar</Link>
        </div>
      </div> : <>
        {disabled && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Simpan seluruh perubahan sebelum meninjau penerbitan.</p>}
        {error && <div ref={errorRef} tabIndex={-1} role="alert" className="mt-5 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
          <p>{error}</p>
          {status === "uncertain" && <p className="mt-2 font-semibold">Jangan mengulangi penerbitan sebelum memeriksa status undangan di daftar atau halaman publik.</p>}
          {conflict && <button type="button" onClick={() => window.location.reload()} className="focus-ring mt-3 min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2">Muat ulang editor</button>}
          {status === "uncertain" && <Link href="/admin/invitations" className="focus-ring mt-3 inline-flex min-h-11 items-center rounded-lg px-2 font-semibold underline underline-offset-2">Periksa daftar undangan</Link>}
        </div>}
        <button ref={reviewButtonRef} type="button" onClick={reviewSavedDraft} disabled={disabled || busy || status === "uncertain"} className="focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-primary/25 bg-brand-soft px-5 text-sm font-semibold text-brand-primary hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
          {status === "reviewing" ? "Memeriksa draf…" : "Tinjau penerbitan"}
        </button>

        {review && <div className="mt-6 rounded-2xl border border-brand-secondary/10 bg-[#fbfcff] p-5">
          <h3 className="text-base font-bold text-brand-secondary">Ringkasan yang akan terbit</h3>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="font-medium text-muted-foreground">Alamat publik</dt><dd className="mt-1 break-all font-semibold text-brand-secondary">{review.publicPath}</dd></div>
            <div><dt className="font-medium text-muted-foreground">Undangan</dt><dd className="mt-1 break-all font-semibold text-brand-secondary">/{review.slug}</dd></div>
            <div><dt className="font-medium text-muted-foreground">Versi terbit saat ini</dt><dd className="mt-1 font-semibold text-brand-secondary">{review.publishedVersion ?? "Belum terbit"}</dd></div>
            <div><dt className="font-medium text-muted-foreground">Versi draf</dt><dd className="mt-1 font-semibold text-brand-secondary">{review.draftVersion}</dd></div>
          </dl>
          <p className="mt-5 text-sm font-semibold text-brand-secondary">Perubahan</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">{review.changeSummary}</p>
          {noContentChanges && <p className="mt-3 text-sm font-medium text-amber-900">Ubah konten yang terlihat oleh tamu, lalu simpan dan tinjau kembali sebelum menerbitkan.</p>}
          <button ref={triggerRef} type="button" onClick={openConfirmation} disabled={disabled || busy || noContentChanges} className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">Terbitkan</button>
        </div>}
      </>}

      <dialog ref={dialogRef} aria-labelledby="publish-confirm-title" onClose={() => window.setTimeout(() => {
        (successRef.current ?? errorRef.current ?? triggerRef.current ?? reviewButtonRef.current)?.focus();
      }, 0)} onCancel={(event) => {
        if (status === "publishing") event.preventDefault();
      }} onClick={(event) => {
        if (event.target === dialogRef.current) closeConfirmation();
      }} className="fixed inset-0 m-auto w-[min(92vw,520px)] max-w-none rounded-[1.5rem] border border-brand-secondary/15 bg-white p-0 text-brand-secondary shadow-floating backdrop:bg-brand-secondary/60">
        {review && <form onSubmit={publish} className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary">Konfirmasi akhir</p><h3 id="publish-confirm-title" className="mt-2 text-xl font-bold">Terbitkan ke {review.publicPath}?</h3></div>
            <button type="button" onClick={closeConfirmation} disabled={status === "publishing"} aria-label="Tutup konfirmasi" className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-secondary/15 disabled:opacity-50"><X size={18} aria-hidden="true" /></button>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{review.publishedVersion === null
            ? `Undangan ini belum memiliki halaman publik. Draf versi ${review.draftVersion} akan menjadi versi terbit pertama.`
            : `Undangan publik akan berubah setelah penerbitan berhasil. Versi terbit ${review.publishedVersion} akan diganti oleh draf versi ${review.draftVersion}.`}</p>
          <label htmlFor="publish-confirm-slug" className="mt-6 block text-sm font-semibold">Ketik slug <span className="font-mono">{review.slug}</span> untuk mengonfirmasi</label>
          <input ref={confirmationRef} id="publish-confirm-slug" type="text" autoComplete="off" spellCheck={false} maxLength={80} value={confirmationSlug} onChange={(event) => setConfirmationSlug(event.target.value)} disabled={status === "publishing"} className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-brand-secondary/20 px-3 text-sm" />
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={closeConfirmation} disabled={status === "publishing"} className="focus-ring min-h-11 rounded-xl border border-brand-secondary/15 px-4 text-sm font-semibold disabled:opacity-50">Batal</button>
            <button type="submit" disabled={confirmationSlug !== review.slug || status === "publishing"} className="focus-ring min-h-11 rounded-xl bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{status === "publishing" ? "Menerbitkan…" : "Ya, terbitkan"}</button>
          </div>
        </form>}
      </dialog>
    </section>
  );
}
