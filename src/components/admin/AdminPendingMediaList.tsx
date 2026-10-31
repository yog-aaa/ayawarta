"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import type { ImageUploadOutcome } from "./AdminImageUploader";

export type PendingDraftMedia = { provisionId: string; slot: string; idempotencyKey: string; createdAt: string };

function slotLabel(slot: string): string {
  if (slot === "hero") return "Foto sampul";
  if (slot === "groom") return "Foto mempelai pria";
  if (slot === "bride") return "Foto mempelai wanita";
  if (slot.startsWith("gallery:")) return "Foto galeri";
  return "Foto undangan";
}

export function AdminPendingMediaList({ pending, disabled, onRecover, onRetryUpload }: {
  pending: readonly PendingDraftMedia[];
  disabled: boolean;
  onRecover: (provisionId: string) => Promise<ImageUploadOutcome>;
  onRetryUpload: (slot: string, file: File, idempotencyKey: string) => Promise<ImageUploadOutcome>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [retryFiles, setRetryFiles] = useState<Record<string, File>>({});
  if (pending.length === 0) return null;

  return <section aria-labelledby="pending-media-title" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
    <h2 id="pending-media-title" className="font-bold">Unggahan menunggu pemulihan</h2>
    <p className="mt-1 leading-6">Foto berikut belum terhubung ke draf. Periksa kembali unggahannya; jika foto belum sampai ke penyimpanan, pilih kembali berkas yang sama.</p>
    <ul className="mt-4 space-y-3">
      {pending.map((item) => <li key={item.provisionId} className="rounded-xl border border-amber-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold">{slotLabel(item.slot)}</p>
          <p role="status" aria-live="polite" className="mt-1 text-xs text-amber-900">{busyId === item.provisionId ? "Memeriksa unggahan…" : messages[item.provisionId] ?? "Menunggu pemeriksaan ulang."}</p>
          {conflictId === item.provisionId && <button type="button" onClick={() => window.location.reload()} className="focus-ring mt-2 min-h-11 rounded-lg px-2 text-xs font-semibold text-brand-primary underline underline-offset-2">Muat ulang editor</button>}
        </div>
        <button type="button" disabled={disabled || busyId !== null} onClick={async () => {
          setBusyId(item.provisionId);
          try {
            const result = await onRecover(item.provisionId);
            if (result.kind !== "verified") setMessages((current) => ({ ...current, [item.provisionId]: result.message }));
            setConflictId(result.kind === "conflict" ? item.provisionId : null);
          } catch {
            setMessages((current) => ({ ...current, [item.provisionId]: "Pemulihan belum berhasil. Coba lagi nanti." }));
          } finally {
            setBusyId(null);
          }
        }} className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 font-semibold text-brand-secondary hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCw size={16} aria-hidden="true" /> Pulihkan foto
        </button>
        </div>
        <div className="mt-3 border-t border-amber-200 pt-3">
          <label htmlFor={`retry-${item.provisionId}`} className="block text-xs font-semibold">Pilih kembali berkas foto yang sama</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input id={`retry-${item.provisionId}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busyId !== null} onChange={(event) => {
              const file = event.target.files?.[0];
              setRetryFiles((current) => {
                const next = { ...current };
                if (file) next[item.provisionId] = file;
                else delete next[item.provisionId];
                return next;
              });
            }} className="focus-ring min-w-0 flex-1 rounded-lg border border-brand-secondary/15 bg-white p-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand-primary disabled:opacity-50" />
            <button type="button" disabled={disabled || busyId !== null || !retryFiles[item.provisionId]} onClick={async () => {
              const file = retryFiles[item.provisionId];
              if (!file) return;
              setBusyId(item.provisionId);
              try {
                const result = await onRetryUpload(item.slot, file, item.idempotencyKey);
                if (result.kind !== "verified") setMessages((current) => ({ ...current, [item.provisionId]: result.message }));
                setConflictId(result.kind === "conflict" ? item.provisionId : null);
              } catch {
                setMessages((current) => ({ ...current, [item.provisionId]: "Unggahan ulang belum berhasil. Coba lagi." }));
              } finally { setBusyId(null); }
            }} className="focus-ring min-h-11 rounded-xl border border-amber-300 px-4 text-xs font-semibold text-brand-secondary hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50">Unggah berkas yang sama</button>
          </div>
        </div>
      </li>)}
    </ul>
  </section>;
}
