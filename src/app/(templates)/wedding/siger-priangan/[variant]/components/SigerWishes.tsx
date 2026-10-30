"use client";

import dynamic from "next/dynamic";

const SigerLiveWishes = dynamic(() => import("./SigerLiveWishes"), {
  ssr: false,
  loading: () => <section className="siger-section siger-wishes" aria-label="Konfirmasi dan ucapan"><p>Memuat formulir ucapan…</p></section>,
});

export default function SigerWishes({ invitationSlug, isPreview = false }: {
  invitationSlug: string;
  isPreview?: boolean;
}) {
  if (!isPreview) return <SigerLiveWishes invitationSlug={invitationSlug} />;
  return <section className="siger-section siger-wishes" aria-labelledby="siger-wishes-title">
    <p className="siger-kicker">Kami menantikan Anda</p>
    <h2 id="siger-wishes-title">Konfirmasi &amp; Ucapan</h2>
    <div className="siger-preview-note" role="status">{invitationSlug === "siger-priangan-sample" ? "Pratinjau contoh" : "Pratinjau draf"}: konfirmasi dan ucapan tidak dapat dikirim.</div>
  </section>;
}
