import { notFound, redirect } from "next/navigation";
import { AdminDraftEditor } from "@/components/admin/AdminDraftEditor";
import { AdminListError } from "@/components/admin/AdminListError";
import { loadAdminEditor } from "@/features/admin/editor-loader";

export const metadata = {
  title: "Sunting Draf Undangan | AyaWarta",
};

export default async function EditAdminInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadAdminEditor(id);
  if (!result.ok) {
    if (result.code === "unauthorized" || result.code === "forbidden") redirect("/admin/login");
    if (result.code === "not_found") notFound();
    return <AdminListError retryHref={`/admin/invitations/${encodeURIComponent(id)}/edit`} title="Editor belum dapat dimuat" headingLevel="h1" />;
  }

  return <AdminDraftEditor initialDraft={result.data.draft} initialPayload={result.data.draft.payload} mediaChoices={result.data.mediaChoices} pendingMedia={result.data.pendingMedia} mediaUploadEnabled={result.data.mediaUploadEnabled} />;
}
