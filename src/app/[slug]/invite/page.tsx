import { notFound } from "next/navigation";

import { invitationRepository } from "@/features/invitations/repository";
import { InvitationMappingError } from "@/features/invitations/mapper";
import InviteClientView from "./components/InviteClientView";

type InvitePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { slug } = await params;
  const invitation = await invitationRepository.findBySlug(slug).catch((error: unknown) => {
    if (error instanceof InvitationMappingError) notFound();
    throw error;
  });

  if (!invitation) {
    notFound();
  }

  return <InviteClientView slug={slug} invitationData={invitation.data} theme={invitation.meta.theme} />;
}
