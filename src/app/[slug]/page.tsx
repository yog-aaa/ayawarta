import "@/app/(templates)/wedding/classic-rose/background.css";
import { notFound } from "next/navigation";

import { InvitationMappingError } from "@/features/invitations/mapper";
import { invitationRepository } from "@/features/invitations/repository";
import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";

type InvitationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ to?: string | string[] }>;
};

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const { slug } = await params;
  const invitation = await invitationRepository.findBySlug(slug).catch((error: unknown) => {
    if (error instanceof InvitationMappingError) notFound();
    throw error;
  });

  if (!invitation) {
    notFound();
  }

  if (invitation.meta.theme === "siger-priangan") {
    const { default: SigerPrianganView } = await import("../(templates)/wedding/siger-priangan/[variant]/components/SigerPrianganView");
    const query = await searchParams;
    const guestName = typeof query?.to === "string" ? query.to.trim().slice(0, 120) : undefined;
    return <SigerPrianganView invitationSlug={slug} data={invitation.data} guestName={guestName} />;
  }

  const { default: ClassicRoseClientView } = await import("../(templates)/wedding/classic-rose/[variant]/components/ClassicRoseClientView");
  return (
    <ClassicRoseClientView
      invitationSlug={slug}
      themeConfig={getClassicRoseThemeConfig(invitation.meta.variant)}
      data={invitation.data}
    />
  );
}
