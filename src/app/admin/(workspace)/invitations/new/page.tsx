import { redirect } from "next/navigation";
import { AdminDraftEditor } from "@/components/admin/AdminDraftEditor";
import { AdminListError } from "@/components/admin/AdminListError";
import { createEmptyDraftPayload } from "@/features/admin/draft-schema";
import { requireAdminSession } from "@/features/auth/service";
import { isAdminAuthorizationError } from "@/app/admin/admin-errors";

export const metadata = {
  title: "Draf Undangan Baru | AyaWarta",
};

export default async function NewAdminInvitationPage() {
  try {
    await requireAdminSession();
  } catch (error) {
    if (isAdminAuthorizationError(error)) redirect("/admin/login");
    return <AdminListError retryHref="/admin/invitations/new" title="Editor belum dapat dimuat" headingLevel="h1" />;
  }

  return <AdminDraftEditor initialPayload={createEmptyDraftPayload()} mediaChoices={[]} />;
}
