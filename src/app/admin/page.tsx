import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, MailOpen, Sparkles } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminInvitationList } from "@/components/admin/AdminInvitationList";
import { AdminListError } from "@/components/admin/AdminListError";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { getAdminInvitationList } from "@/features/admin/invitation-list";
import { requireAdminSession } from "@/features/auth/service";
import { isAdminAuthorizationError } from "./admin-errors";

export const metadata = {
  title: "Ringkasan Admin | AyaWarta",
};

export default async function AdminDashboardPage() {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return <AdminUnavailable retryHref="/admin" />;
  }

  let invitations;
  try {
    invitations = await getAdminInvitationList({ page: 1 });
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return (
      <AdminShell adminName={admin.name} activePage="overview">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">
            Ruang kerja AyaWarta
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl">
            Ringkasan undangan
          </h1>
        </div>
        <AdminListError retryHref="/admin" />
      </AdminShell>
    );
  }

  return (
    <AdminShell adminName={admin.name} activePage="overview">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">
            Ruang kerja AyaWarta
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl">
            Ringkasan undangan
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Temukan undangan yang tersimpan dan buka halaman publiknya.
          </p>
        </div>
        <Link
          href="/admin/invitations"
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover motion-reduce:transition-none"
        >
          Lihat semua undangan
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>

      <div className="mb-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-secondary p-6 text-white shadow-card sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border-[32px] border-white/5" />
          <div className="relative">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <MailOpen size={23} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-white/75">Undangan tersimpan</p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums" aria-label={`${invitations.total} undangan tersimpan`}>
              {invitations.total.toLocaleString("id-ID")}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
              Jumlah undangan dari data yang saat ini tersedia.
            </p>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-brand-secondary/10 bg-white p-6 shadow-subtle sm:p-8">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
            <Sparkles size={23} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-brand-secondary sm:text-2xl">
            Kelola cerita dengan jelas.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            Gunakan daftar undangan untuk mencari acara, memeriksa tanggalnya,
            dan membuka tampilan yang sudah terbit.
          </p>
          <div className="mt-7 h-px bg-brand-secondary/10" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Panel administrator
          </p>
        </section>
      </div>

      <section aria-labelledby="admin-overview-list-title" className="overflow-hidden rounded-[1.75rem] border border-brand-secondary/10 bg-white shadow-subtle">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-secondary/10 px-5 py-5 sm:px-7">
          <div>
            <h2 id="admin-overview-list-title" className="text-lg font-bold text-brand-secondary">
              Daftar undangan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Menampilkan hingga lima undangan dari halaman pertama.
            </p>
          </div>
          <Link href="/admin/invitations" className="focus-ring rounded-lg px-2 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-soft">
            Buka daftar
          </Link>
        </div>
        <AdminInvitationList items={invitations.items.slice(0, 5)} />
      </section>
    </AdminShell>
  );
}
