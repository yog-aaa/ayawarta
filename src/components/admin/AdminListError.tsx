import Link from "next/link";
import { AlertCircle, RotateCw } from "lucide-react";

export function AdminListError({
  retryHref,
  title = "Daftar undangan belum dapat dimuat",
  headingLevel = "h2",
}: {
  retryHref: string;
  title?: string;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <div role="alert" className="rounded-[1.75rem] border border-destructive/20 bg-white p-6 shadow-subtle sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle size={24} aria-hidden="true" />
      </div>
      <Heading className="text-lg font-bold text-brand-secondary">{title}</Heading>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Coba muat ulang halaman. Jika masalah berlanjut, periksa kembali nanti.
      </p>
      <Link
        href={retryHref}
        className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover"
      >
        <RotateCw size={16} aria-hidden="true" /> Coba lagi
      </Link>
    </div>
  );
}
