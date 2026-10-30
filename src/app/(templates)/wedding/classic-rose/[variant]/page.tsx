import React from "react";
import { notFound } from "next/navigation";
import "../background.css";

import { getClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";
import { InvitationMappingError } from "@/features/invitations/mapper";
import { invitationRepository } from "@/features/invitations/repository";
import ClassicRoseClientView from "./components/ClassicRoseClientView";

const VALID_VARIANTS = [
  "red",
  "green",
  "blue",
  "orange",
  "black",
  "white",
] as const;

type ClassicRosePageProps = {
  params: Promise<{ variant: string }>;
  searchParams?: Promise<{ slug?: string }>;
};

export default async function ClassicRosePage({
  params,
  searchParams,
}: ClassicRosePageProps) {
  const { variant } = await params;

  if (!VALID_VARIANTS.includes(variant as (typeof VALID_VARIANTS)[number])) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const targetSlug = resolvedSearchParams?.slug || "default-preview";

  const invitation = await invitationRepository.findBySlug(targetSlug).catch((error: unknown) => {
    if (error instanceof InvitationMappingError) notFound();
    throw error;
  });

  if (!invitation || invitation.meta.theme !== "classic-rose") {
    notFound();
  }

  const themeConfig = getClassicRoseThemeConfig(variant);

  return (
    <ClassicRoseClientView
      invitationSlug={targetSlug}
      themeConfig={themeConfig}
      data={invitation.data}
    />
  );
}
