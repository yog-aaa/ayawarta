"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { openPublishedInvitationDraftAction } from "@/app/admin/actions";

export function AdminOpenDraftButton({ invitationId, draftId }: { invitationId: string; draftId?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const className = "focus-ring inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-brand-primary hover:bg-brand-soft";

  if (draftId) {
    return <Link href={`/admin/invitations/${encodeURIComponent(draftId)}/edit`} className={className}>
      <PencilLine size={15} aria-hidden="true" /> Sunting draf
    </Link>;
  }

  return <div className="inline-flex flex-col items-end">
    <button type="button" disabled={pending} onClick={async () => {
      setPending(true);
      setError("");
      try {
        const result = await openPublishedInvitationDraftAction({ invitationId });
        if (!result.ok) {
          if (result.code === "unauthorized" || result.code === "forbidden") {
            router.replace("/admin/login");
            return;
          }
          setError(result.message);
          setPending(false);
          return;
        }
        router.push(`/admin/invitations/${encodeURIComponent(result.data.id)}/edit`);
      } catch {
        setError("Draf belum dapat dibuka. Coba lagi.");
        setPending(false);
      }
    }} className={`${className} disabled:cursor-not-allowed disabled:opacity-50`}>
      <PencilLine size={15} aria-hidden="true" /> {pending ? "Membuka…" : "Mulai sunting"}
    </button>
    {error && <p role="alert" className="max-w-48 text-right text-xs leading-5 text-destructive">{error}</p>}
  </div>;
}
