import { notFound } from "next/navigation";

import { invitationRepository } from "@/features/invitations/repository";
import InviteClientView from "./components/InviteClientView";

type InvitePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { slug } = await params;
  const invitation = await invitationRepository.findBySlug(slug);

  if (!invitation) {
    notFound();
  }

  return <InviteClientView slug={slug} invitationData={invitation.data} />;
}
