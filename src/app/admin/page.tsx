import { redirect } from "next/navigation";
import Image from "next/image";
import { requireAdminSession } from "@/features/auth/service";
import { logoutAction } from "@/features/auth/actions";

export const metadata = {
  title: "Dashboard Admin | AyaWarta",
};

export default async function AdminDashboardPage() {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="AyaWarta"
              width={120}
              height={36}
              className="h-8 w-auto object-contain"
            />
            <span className="text-xs font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Admin Panel
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          <h1 className="text-xl font-bold text-slate-900">
            Selamat Datang, {admin.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sesi administrator aktif Anda telah terverifikasi melalui Auth.js dan PostgreSQL.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                User ID
              </span>
              <span className="mt-1 text-sm font-mono text-slate-800 block truncate">
                {admin.id}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Email
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-800 block truncate">
                {admin.email}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Role Akses
              </span>
              <span className="mt-1 text-sm font-semibold text-blue-600 block">
                {admin.role}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
