import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminListError } from "@/components/admin/AdminListError";
import { loadAdminPreview } from "@/features/admin/editor-loader";
import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";
import ClassicRoseClientView from "@/app/(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView";
import SigerPrianganView from "@/app/(templates)/wedding/siger-priangan/[variant]/components/SigerPrianganView";
import "@/app/(templates)/wedding/classic-rose/background.css";

export const metadata = {
  title: "Pratinjau Draf Undangan | AyaWarta",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDraftPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editHref = `/admin/invitations/${encodeURIComponent(id)}/edit`;
  const result = await loadAdminPreview(id);
  if (!result.ok) {
    if (result.code === "unauthorized" || result.code === "forbidden") redirect("/admin/login");
    if (result.code === "not_found") notFound();
    return <main className="mx-auto min-h-svh max-w-3xl bg-brand-soft px-4 py-12"><AdminListError retryHref={`/admin/invitations/${encodeURIComponent(id)}/preview`} title="Pratinjau belum dapat dimuat" headingLevel="h1" /></main>;
  }

  const preview = result.data;
  if (preview.kind === "incomplete") {
    return (
      <main className="min-h-svh bg-brand-soft px-4 py-10 text-brand-secondary">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-brand-secondary/10 bg-white p-6 shadow-card sm:p-9">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-brand-primary">Draf privat</span>
          <h1 className="mt-5 text-2xl font-bold sm:text-3xl">Pratinjau belum lengkap</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Lengkapi dan simpan kolom berikut agar draf dapat ditampilkan. Halaman publik tetap tidak berubah.</p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm">
            {Object.entries(preview.fieldErrors).map(([field, messages]) => <li key={field}><strong>{field}</strong>: {messages.join(" ")}</li>)}
          </ul>
          <Link href={editHref} className="focus-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-primary-hover">
            <ArrowLeft size={17} aria-hidden="true" /> Kembali ke editor
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-brand-soft">
      <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b border-brand-secondary/15 bg-brand-secondary px-4 py-3 text-sm text-white sm:px-6">
        <p className="font-bold">Draf · Pratinjau privat</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-white/80">Konfirmasi dan ucapan dinonaktifkan</span>
          <Link href={editHref} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 px-3 font-semibold hover:bg-white/10">
            <ArrowLeft size={16} aria-hidden="true" /> Kembali ke editor
          </Link>
        </div>
      </div>
      {preview.missingMediaFields.length > 0 && <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
        Foto atau musik belum tersedia pada {preview.missingMediaFields.length} kolom. Pratinjau menampilkan tempat kosong untuk media tersebut; draf belum dapat diterbitkan.
      </div>}
      {preview.meta.theme === "classic-rose" ? (
        <ClassicRoseClientView
          invitationSlug={preview.slug}
          themeConfig={getClassicRoseThemeConfig(preview.meta.variant)}
          data={preview.data}
          isDraftPreview
        />
      ) : (
        <SigerPrianganView data={preview.data} invitationSlug={preview.slug} isPreview />
      )}
    </div>
  );
}
