import Link from "next/link";
import { ArrowUpRight, CalendarDays, MailOpen } from "lucide-react";
import type { AdminInvitationSummary } from "@/features/admin/invitation-list";
import { AdminOpenDraftButton } from "./AdminOpenDraftButton";

function dateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function previewHref(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

export function AdminInvitationList({
  items,
  searchQuery,
  draftIds = {},
  showEditorActions = false,
}: {
  items: readonly AdminInvitationSummary[];
  searchQuery?: string;
  draftIds?: Readonly<Record<string, string>>;
  showEditorActions?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
          <MailOpen size={25} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-brand-secondary">
          {searchQuery ? "Tidak ada undangan yang cocok" : "Belum ada undangan"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {searchQuery
            ? "Coba kata kunci lain atau hapus pencarian untuk melihat semua undangan."
            : "Undangan yang tersimpan akan tampil di sini setelah tersedia."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-brand-secondary/10 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-bold text-brand-secondary">{item.coupleName}</p>
                {showEditorActions && <p className="mt-1 text-[11px] font-semibold text-brand-primary">Terbit{draftIds[item.id] ? " · Draf tersimpan" : ""}</p>}
                <p className="mt-1 break-all text-xs text-muted-foreground">/{item.slug}</p>
              </div>
              <Link
                href={previewHref(item.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-brand-secondary/15 px-3 text-xs font-semibold text-brand-primary hover:bg-brand-soft"
                aria-label={`Buka undangan ${item.coupleName} di tab baru`}
              >
                Buka <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-secondary/10 pt-4 text-xs">
              <div>
                <dt className="text-muted-foreground">Tema</dt>
                <dd className="mt-1 font-semibold capitalize text-brand-secondary">{item.theme} · {item.variant}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tanggal acara</dt>
                <dd className="mt-1 font-semibold text-brand-secondary">{dateLabel(item.weddingDate)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Diperbarui</dt>
                <dd className="mt-1 font-semibold text-brand-secondary">{dateLabel(item.updatedAt)}</dd>
              </div>
            </dl>
            {showEditorActions && <div className="mt-4 flex justify-end border-t border-brand-secondary/10 pt-3"><AdminOpenDraftButton invitationId={item.id} draftId={draftIds[item.id]} /></div>}
          </li>
        ))}
      </ul>

      <div className="hidden w-full overflow-x-auto md:block">
        <table className="w-full min-w-[690px] border-collapse text-left text-sm">
          <thead className="bg-brand-soft/75 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-4 sm:px-7">Undangan</th>
              <th scope="col" className="px-4 py-4">Tema</th>
              <th scope="col" className="px-4 py-4">Tanggal acara</th>
              <th scope="col" className="px-4 py-4">Diperbarui</th>
              <th scope="col" className="px-5 py-4 text-right sm:px-7">{showEditorActions ? "Tindakan" : "Pratinjau"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-secondary/10">
            {items.map((item) => (
              <tr key={item.id} className="align-middle">
                <td className="max-w-[240px] px-5 py-4 sm:px-7">
                  <p className="break-words font-bold text-brand-secondary">{item.coupleName}</p>
                  {showEditorActions && <p className="mt-1 text-[11px] font-semibold text-brand-primary">Terbit{draftIds[item.id] ? " · Draf tersimpan" : ""}</p>}
                  <p className="mt-1 break-all text-xs text-muted-foreground">/{item.slug}</p>
                </td>
                <td className="px-4 py-4 capitalize text-brand-secondary">
                  {item.theme}<span className="block text-xs text-muted-foreground">{item.variant}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-brand-secondary">
                  <CalendarDays size={15} className="mr-2 inline text-brand-primary" aria-hidden="true" />
                  {dateLabel(item.weddingDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{dateLabel(item.updatedAt)}</td>
                <td className="px-5 py-4 text-right sm:px-7">
                  <div className="flex flex-wrap justify-end gap-1">
                  {showEditorActions && <AdminOpenDraftButton invitationId={item.id} draftId={draftIds[item.id]} />}
                  <Link
                    href={previewHref(item.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-brand-primary hover:bg-brand-soft"
                    aria-label={`Buka undangan ${item.coupleName} di tab baru`}
                  >
                    Buka <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
