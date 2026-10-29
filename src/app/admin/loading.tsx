import Image from "next/image";

export default function AdminLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-brand-soft px-4">
      <div role="status" aria-live="polite" className="w-full max-w-sm rounded-3xl border border-brand-secondary/10 bg-white p-8 text-center shadow-card">
        <Image src="/images/logo.png" alt="AyaWarta" width={140} height={42} className="mx-auto h-10 w-auto object-contain" />
        <div aria-hidden="true" className="mx-auto mt-8 h-1.5 w-24 rounded-full bg-brand-primary/20" />
        <p className="mt-5 text-sm font-semibold text-brand-secondary">Menyiapkan panel administrator…</p>
      </div>
    </div>
  );
}
