"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, MailOpen, Menu, X } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";

export type AdminPage = "overview" | "invitations";

const NAV_ITEMS = [
  { href: "/admin", label: "Ringkasan", page: "overview", icon: LayoutDashboard },
  { href: "/admin/invitations", label: "Undangan", page: "invitations", icon: MailOpen },
] as const;

function NavLinks({ activePage, onNavigate }: { activePage: AdminPage; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigasi panel admin" className="space-y-1">
      {NAV_ITEMS.map(({ href, label, page, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={activePage === page ? "page" : undefined}
          className={`focus-ring flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors motion-reduce:transition-none ${
            activePage === page
              ? "bg-brand-primary text-white shadow-[0_5px_14px_rgba(2,100,255,0.2)]"
              : "text-muted-foreground hover:bg-brand-soft hover:text-brand-secondary"
          }`}
        >
          <Icon size={19} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-brand-soft hover:text-brand-secondary motion-reduce:transition-none ${mobile ? "border border-brand-secondary/10" : ""}`}
      >
        <LogOut size={19} aria-hidden="true" />
        Keluar
      </button>
    </form>
  );
}

export function AdminNavigation({ adminName, activePage }: { adminName: string; activePage: AdminPage }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = () => {
    dialogRef.current?.showModal();
    setIsOpen(true);
  };

  const closeMenu = () => dialogRef.current?.close();

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <aside
        className="sticky top-0 hidden h-svh w-[260px] shrink-0 flex-col border-r border-brand-secondary/10 bg-white px-4 py-6 lg:flex"
        aria-label="Panel admin"
      >
        <Link href="/admin" className="focus-ring mb-9 flex items-center rounded-xl px-3 py-2">
          <Image src="/images/logo.png" alt="AyaWarta" width={140} height={42} className="h-10 w-auto object-contain" priority />
          <span className="sr-only">Kembali ke ringkasan</span>
        </Link>
        <p className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Ruang kerja
        </p>
        <NavLinks activePage={activePage} />
        <div className="mt-auto border-t border-brand-secondary/10 pt-5">
          <p className="truncate px-4 text-sm font-bold text-brand-secondary">{adminName}</p>
          <p className="mb-4 mt-1 px-4 text-xs text-muted-foreground">Administrator</p>
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-brand-secondary/10 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:hidden">
        <Link href="/admin" className="focus-ring rounded-lg py-1">
          <Image src="/images/logo.png" alt="AyaWarta" width={120} height={36} className="h-9 w-auto object-contain" priority />
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={openMenu}
          aria-haspopup="dialog"
          aria-controls="admin-mobile-menu"
          aria-expanded={isOpen}
          aria-label="Buka navigasi admin"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-brand-secondary/15 text-brand-secondary"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        id="admin-mobile-menu"
        aria-label="Navigasi admin"
        onClose={handleClose}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeMenu();
        }}
        className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-dvh w-[min(88vw,340px)] max-w-none border-0 bg-white p-0 text-brand-secondary shadow-floating backdrop:bg-brand-secondary/50 lg:hidden"
      >
        <div className="flex min-h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center justify-between gap-3 px-2">
            <Image src="/images/logo.png" alt="AyaWarta" width={126} height={38} className="h-9 w-auto object-contain" />
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Tutup navigasi admin"
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-brand-secondary/15"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Ruang kerja
          </p>
          <NavLinks activePage={activePage} onNavigate={closeMenu} />
          <div className="mt-auto border-t border-brand-secondary/10 pt-5">
            <p className="truncate px-4 text-sm font-bold">{adminName}</p>
            <p className="mb-4 mt-1 px-4 text-xs text-muted-foreground">Administrator</p>
            <LogoutButton mobile />
          </div>
        </div>
      </dialog>
    </>
  );
}
