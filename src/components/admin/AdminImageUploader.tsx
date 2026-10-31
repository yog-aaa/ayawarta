"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";

export type ImageUploadOutcome =
  | { kind: "verified" }
  | { kind: "pending"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string };

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AdminImageUploader({
  slot, label, disabled, hasPending, onUpload,
}: {
  slot: string;
  label: string;
  disabled: boolean;
  hasPending: boolean;
  onUpload: (slot: string, file: File, idempotencyKey: string) => Promise<ImageUploadOutcome>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ImageUploadOutcome | null>(null);
  const id = `upload-${slot.replace(/[^a-z0-9-]/gi, "-")}`;

  const upload = async () => {
    if (!file || !idempotencyKey || disabled || busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      const next = await onUpload(slot, file, idempotencyKey);
      setOutcome(next);
      if (next.kind === "verified" || next.kind === "pending") {
        setFile(null);
        setIdempotencyKey("");
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch {
      setOutcome({ kind: "error", message: "Unggahan belum berhasil. Coba lagi dengan berkas yang sama." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-secondary/10 bg-brand-soft/70 p-3 sm:p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-brand-secondary">Unggah {label.toLowerCase()}</label>
      <p id={`${id}-help`} className="mt-1 text-xs leading-5 text-muted-foreground">JPG, PNG, atau WebP. Foto belum tampil di undangan publik sampai diterbitkan.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          aria-describedby={`${id}-help ${id}-status`}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setOutcome(null);
            if (selected && !allowedTypes.has(selected.type)) {
              setFile(null);
              setIdempotencyKey("");
              setOutcome({ kind: "error", message: "Pilih berkas JPG, PNG, atau WebP." });
              return;
            }
            setFile(selected);
            setIdempotencyKey(selected ? crypto.randomUUID() : "");
          }}
          className="focus-ring min-w-0 flex-1 rounded-lg border border-brand-secondary/15 bg-white p-2 text-xs text-brand-secondary file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand-primary disabled:opacity-50"
        />
        <button type="button" onClick={upload} disabled={!file || disabled || busy} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          <ImageUp size={17} aria-hidden="true" /> {busy ? "Memeriksa foto…" : "Unggah foto"}
        </button>
      </div>
      <p id={`${id}-status`} role={outcome?.kind === "error" || outcome?.kind === "conflict" ? "alert" : "status"} aria-live="polite" className="mt-2 text-xs leading-5 text-muted-foreground">
        {busy ? "Foto sedang diunggah dan diverifikasi." : outcome?.kind === "verified" ? "Foto terverifikasi dan dipilih. Simpan draf untuk memakai foto ini." : outcome?.message ?? (disabled ? "Simpan draf dan seluruh perubahan sebelum mengunggah." : hasPending ? "Unggahan sebelumnya masih menunggu pemulihan. Anda dapat memulihkannya atau memilih foto lain." : "Pilih berkas, lalu tekan Unggah foto.")}
      </p>
      {outcome?.kind === "conflict" && <button type="button" onClick={() => window.location.reload()} className="focus-ring mt-2 min-h-11 rounded-lg px-2 text-xs font-semibold text-brand-primary underline underline-offset-2">Muat ulang editor</button>}
    </div>
  );
}
