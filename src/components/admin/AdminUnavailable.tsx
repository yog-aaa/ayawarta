import { AdminListError } from "./AdminListError";

export function AdminUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-brand-soft px-4">
      <div className="w-full max-w-xl">
        <AdminListError
          retryHref={retryHref}
          title="Panel administrator belum dapat dimuat"
          headingLevel="h1"
        />
      </div>
    </main>
  );
}
