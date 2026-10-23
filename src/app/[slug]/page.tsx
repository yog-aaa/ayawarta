import "@/app/(templates)/wedding/classic-rose/background.css";
import { notFound } from "next/navigation";

import ClassicRoseClientView from "../(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView";
import { invitationRepository } from "@/features/invitations/repository";
import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";

type InvitationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { slug } = await params;
  const invitation = await invitationRepository.findBySlug(slug);

  if (!invitation) {
    notFound();
  }

  const variant = invitation.meta.variant ?? "red";

  return (
    <ClassicRoseClientView
      invitationSlug={slug}
      themeConfig={getClassicRoseThemeConfig(variant)}
      data={invitation.data}
    />
  );
}
