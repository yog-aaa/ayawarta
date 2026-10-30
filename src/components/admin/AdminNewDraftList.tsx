import Link from "next/link";
import { ArrowRight, FilePenLine } from "lucide-react";
import type { AdminDraftIndexResult } from "@/features/admin/draft-index";

function updatedLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date);
}

export function AdminNewDraftList({ drafts }: { drafts: AdminDraftIndexResult["newDrafts"] }) {
  if (drafts.length === 0) {
    return <p className="px-5 py-8 text-sm text-muted-foreground sm:px-7">Belum ada draf baru. Pilih “Buat draf” untuk memulai undangan privat.</p>;
  }

  return <ul className="divide-y divide-brand-secondary/10">
    {drafts.map((draft) => <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary"><FilePenLine size={20} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-brand-secondary">{draft.coupleName}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">/{draft.proposedSlug || "slug-belum-diisi"} · {draft.theme ?? "Tema belum dipilih"}{draft.variant ? ` / ${draft.variant}` : ""}</p>
          <p className="mt-1 text-xs text-muted-foreground">Diperbarui {updatedLabel(draft.updatedAt)} · versi {draft.draftVersion}{!draft.valid ? " · Perlu perbaikan" : ""}</p>
        </div>
      </div>
      <Link href={`/admin/invitations/${encodeURIComponent(draft.id)}/edit`} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-primary/20 px-4 text-sm font-semibold text-brand-primary hover:bg-brand-soft">
        Lanjutkan draf <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </li>)}
  </ul>;
}
