import { notFound } from "next/navigation";
import { sigerPrianganSample } from "@/features/invitations/siger-priangan-sample";
import { isSigerPrianganVariant } from "@/lib/theme-config/siger-priangan";
import SigerPrianganView from "./components/SigerPrianganView";

export const metadata = {
  title: "Siger Priangan | Pratinjau AyaWarta",
  description: "Contoh ilustratif template undangan pernikahan Siger Priangan.",
};

export default async function SigerPrianganPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;
  if (!isSigerPrianganVariant(variant)) notFound();
  return (
    <SigerPrianganView
      invitationSlug="siger-priangan-sample"
      data={sigerPrianganSample.invitation.data}
      isPreview
    />
  );
}
