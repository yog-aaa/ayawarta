import Image from "next/image";
import { redirect } from "next/navigation";
import { getValidAdminSession } from "@/features/auth/service";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Masuk Administrator | AyaWarta",
  description: "Masuk ke portal administrasi AyaWarta",
};

export default async function AdminLoginPage() {
  // Revalidate current database state: only redirect if user is currently an active,
  // non-locked administrator in PostgreSQL. Stale or revoked sessions remain on this page
  // so the user can enter valid credentials and is not trapped in a redirect loop.
  const admin = await getValidAdminSession();
  if (admin) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center mb-4">
          <Image
            src="/images/logo.png"
            alt="AyaWarta Logo"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Portal Administrator
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Masuk untuk mengelola data undangan digital
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl sm:px-10">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Akses terbatas hanya untuk staf administrator resmi AyaWarta.
        </p>
      </div>
    </div>
  );
}
