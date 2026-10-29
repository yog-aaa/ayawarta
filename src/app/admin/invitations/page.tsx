import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminInvitationList } from "@/components/admin/AdminInvitationList";
import { AdminListError } from "@/components/admin/AdminListError";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { getAdminInvitationList } from "@/features/admin/invitation-list";
import { requireAdminSession } from "@/features/auth/service";
import { isAdminAuthorizationError } from "../admin-errors";

export const metadata = {
  title: "Daftar Undangan Admin | AyaWarta",
};

type SearchParams = {
  q?: string | string[];
  page?: string | string[];
};

function listHref(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin/invitations?${suffix}` : "/admin/invitations";
}

export default async function AdminInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return <AdminUnavailable retryHref="/admin/invitations" />;
  }

  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 80);
  const pageText = typeof params.page === "string" ? params.page : "";
  const page = /^\d+$/.test(pageText) ? Math.max(1, Math.min(Number(pageText), 1000)) : 1;

  let invitations;
  try {
    invitations = await getAdminInvitationList({ q: query || undefined, page });
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return (
      <AdminShell adminName={admin.name} activePage="invitations">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">
            Katalog undangan
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl">
            Undangan
          </h1>
        </div>
        <AdminListError retryHref={listHref(query, page)} />
      </AdminShell>
    );
  }

  const hasPrevious = invitations.page > 1;
  const hasNext = invitations.page < invitations.pageCount;

  return (
    <AdminShell adminName={admin.name} activePage="invitations">
      <div className="mb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">
          Katalog undangan
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl">
          Undangan
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Cari berdasarkan nama pasangan atau tautan undangan.
        </p>
      </div>

      <section aria-label="Daftar undangan" className="overflow-hidden rounded-[1.75rem] border border-brand-secondary/10 bg-white shadow-subtle">
        <div className="flex flex-col gap-5 border-b border-brand-secondary/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <form action="/admin/invitations" method="get" role="search" className="w-full max-w-md">
            <label htmlFor="admin-invitation-search" className="mb-2 block text-sm font-semibold text-brand-secondary">
              Cari undangan
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="admin-invitation-search"
                  name="q"
                  type="search"
                  maxLength={80}
                  defaultValue={query}
                  placeholder="Nama pasangan atau slug"
                  className="focus-ring min-h-11 w-full rounded-xl border border-brand-secondary/15 bg-brand-soft py-2.5 pl-11 pr-3 text-sm text-brand-secondary placeholder:text-muted"
                />
              </div>
              <button type="submit" className="focus-ring min-h-11 shrink-0 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover motion-reduce:transition-none">
                Cari
              </button>
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p aria-live="polite">
              {invitations.total.toLocaleString("id-ID")} undangan ditemukan
            </p>
            {query && (
              <Link href="/admin/invitations" className="focus-ring rounded-lg px-2 py-2 font-semibold text-brand-primary hover:bg-brand-soft">
                Hapus pencarian
              </Link>
            )}
          </div>
        </div>

        <AdminInvitationList items={invitations.items} searchQuery={query} />

        {invitations.pageCount > 1 && (
          <nav aria-label="Halaman daftar undangan" className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-secondary/10 px-5 py-4 sm:px-7">
            <p className="text-sm text-muted-foreground">
              Halaman <span className="font-semibold text-brand-secondary">{invitations.page}</span> dari {invitations.pageCount}
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link href={listHref(query, invitations.page - 1)} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-xl border border-brand-secondary/15 px-3 text-sm font-semibold text-brand-secondary hover:bg-brand-soft" aria-label="Halaman sebelumnya">
                  <ChevronLeft size={16} aria-hidden="true" /> Sebelumnya
                </Link>
              ) : (
                <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-brand-secondary/10 px-3 text-sm font-semibold text-muted-foreground">
                  <ChevronLeft size={16} aria-hidden="true" /> Sebelumnya
                </span>
              )}
              {hasNext ? (
                <Link href={listHref(query, invitations.page + 1)} className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-xl border border-brand-secondary/15 px-3 text-sm font-semibold text-brand-secondary hover:bg-brand-soft" aria-label="Halaman berikutnya">
                  Berikutnya <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-brand-secondary/10 px-3 text-sm font-semibold text-muted-foreground">
                  Berikutnya <ChevronRight size={16} aria-hidden="true" />
                </span>
              )}
            </div>
          </nav>
        )}
      </section>
    </AdminShell>
  );
}
