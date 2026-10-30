import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { requireAdminSession } from "@/features/auth/service";
import { isAdminAuthorizationError } from "../admin-errors";

export default async function AdminWorkspaceLayout({ children }: { children: ReactNode }) {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return <AdminUnavailable retryHref="/admin" />;
  }

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
