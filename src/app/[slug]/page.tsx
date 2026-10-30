import "@/app/(templates)/wedding/classic-rose/background.css";
import { notFound } from "next/navigation";

import ClassicRoseClientView from "../(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView";
import { InvitationMappingError } from "@/features/invitations/mapper";
import { invitationRepository } from "@/features/invitations/repository";
import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";

type InvitationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { slug } = await params;
  const invitation = await invitationRepository.findBySlug(slug).catch((error: unknown) => {
    if (error instanceof InvitationMappingError) notFound();
    throw error;
  });

  if (!invitation || invitation.meta.theme !== "classic-rose") {
    notFound();
  }

  const variant = invitation.meta.variant;

  return (
    <ClassicRoseClientView
      invitationSlug={slug}
      themeConfig={getClassicRoseThemeConfig(variant)}
      data={invitation.data}
    />
  );
}
