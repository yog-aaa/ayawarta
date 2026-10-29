import type { ReactNode } from "react";
import { AdminNavigation, type AdminPage } from "./AdminNavigation";

export function AdminShell({
  adminName,
  activePage,
  children,
}: {
  adminName: string;
  activePage: AdminPage;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#f6f9ff] text-brand-secondary lg:flex">
      <a href="#admin-main" className="skip-link">
        Lewati navigasi admin
      </a>
      <AdminNavigation adminName={adminName} activePage={activePage} />
      <div className="min-w-0 flex-1">
        <main
          id="admin-main"
          className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-11"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
