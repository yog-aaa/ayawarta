"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { InvitationData, Person } from "@/features/invitations/types";
import SigerWishes from "./SigerWishes";
import "../../siger-priangan.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
});

const subscribeToGateHash = (listener: () => void) => {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
};
const getGateSnapshot = () => window.location.hash ? "open" as const : "closed" as const;
const getServerGateSnapshot = () => "ssr" as const;

function Portrait({ src, name, hero = false }: { src: string; name: string; hero?: boolean }) {
  return <div className={hero ? "siger-portrait siger-portrait-hero" : "siger-portrait"}>
    {src ? <Image src={src} alt={`Foto ${name}`} fill sizes={hero ? "(max-width: 600px) 180px, 220px" : "(max-width: 600px) 80px, 120px"} className="siger-portrait-image" priority={hero} /> : <span aria-hidden="true" className="siger-portrait-empty">✧</span>}
  </div>;
}

function Profile({ person, label, index }: { person: Person; label: string; index: number }) {
  return <article className="siger-profile">
    <span className="siger-profile-index" aria-hidden="true">0{index}</span>
    <Portrait src={person.photo} name={person.name} />
    <div className="siger-profile-copy"><p className="siger-overline">{label}</p><h3>{person.name}</h3>{person.parents && <p className="siger-muted">{person.parents}</p>}
      {person.instagram && <a href={`https://instagram.com/${person.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="siger-inline-link">Instagram ↗</a>}
    </div>
  </article>;
}

export default function SigerPrianganView({ data, invitationSlug, isPreview = false, guestName }: {
  data: InvitationData;
  invitationSlug: string;
  isPreview?: boolean;
  guestName?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const hydratedGate = useSyncExternalStore(subscribeToGateHash, getGateSnapshot, getServerGateSnapshot);
  const [interactionGate, setInteractionGate] = useState<"opening" | "open" | null>(null);
  const gate = interactionGate ?? hydratedGate;
  const focusOnOpen = useRef(false);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (gate !== "closed" && gate !== "opening") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [gate]);

  useEffect(() => {
    if (gate !== "opening") return;
    const timer = window.setTimeout(() => setInteractionGate("open"), 1700);
    return () => window.clearTimeout(timer);
  }, [gate]);

  useEffect(() => {
    if (gate !== "open" || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    window.scrollTo(0, 0);
    contentRef.current?.focus({ preventScroll: true });
  }, [gate]);

  const groom = data.couple.groom;
  const bride = data.couple.bride;
  const coupleName = `${groom.name} & ${bride.name}`;
  const date = dateFormat.format(data.weddingDate);
  const initials = `${groom.name.trim()[0] || "A"}·${bride.name.trim()[0] || "W"}`;
  const chapterPhoto = data.sections.gallery
    ? data.gallery?.items.find((item) => item.url)
    : undefined;
  const chapterImage = chapterPhoto?.url || data.couple.heroImage;
  const chapterAlt = chapterPhoto?.altText || `Foto ${coupleName}`;

  async function copyAccount(number: string) {
    try { await navigator.clipboard.writeText(number); setCopied(number); }
    catch { setCopied(null); }
  }

  function openInvitation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (gate === "ssr") return;
    event.preventDefault();
    if (gate !== "closed") return;
    focusOnOpen.current = true;
    setInteractionGate(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "open" : "opening");
  }

  return <div className="siger-shell" data-gate={gate}>
    <noscript><style>{'.siger-shell[data-gate="ssr"]{height:auto;overflow:visible}.siger-shell[data-gate="ssr"] .siger-content{display:block!important}'}</style></noscript>
    {isPreview && <div className="siger-preview-banner" role="status">{invitationSlug === "siger-priangan-sample" ? "Pratinjau ilustratif" : "Pratinjau draf"} · Tidak menerima konfirmasi atau ucapan</div>}
    <header className="siger-cover-stage">
      <div className="siger-cover-side siger-cover-side-left" aria-hidden="true">Sebuah cerita<br />yang menjadi<br />kenang-kenangan.</div>
      <div className="siger-opening-leaves" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="siger-cover-paper">
        <div className="siger-cover-relief" aria-hidden="true">
          <svg viewBox="0 0 320 124" fill="none" focusable="false">
            <path d="M96 48 C124 48 137 31 160 31 C183 31 196 48 224 48" />
            <path d="M54 78 C96 78 122 52 160 52 C198 52 224 78 266 78" />
            <path d="M22 112 C75 112 112 73 160 73 C208 73 245 112 298 112" />
            <path className="siger-contour-glint" d="M80 104 C108 94 132 73 160 73 C188 73 212 94 240 104" />
          </svg>
        </div>
        <div className="siger-cover-horizon" aria-hidden="true" />
        <div className="siger-cover-content">
          <p className="siger-kicker">AyaWarta · Siger Priangan</p>
          <p className="siger-cover-label">Undangan Pernikahan</p>
          <Portrait src={data.couple.heroImage} name={coupleName} hero />
          <h1>{coupleName}</h1>
          <p className="siger-cover-date">{date}</p>
          {guestName && <p className="siger-cover-guest">Kepada Yth.<strong>{guestName}</strong></p>}
          <a className="siger-button siger-cover-button" href="#siger-content" onClick={openInvitation}>Buka Undangan <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="siger-cover-side siger-cover-side-right" aria-hidden="true">Dari kertas,<br />cahaya, dan<br />cerita kita.</div>
    </header><main className="siger-content" id="siger-content" ref={contentRef} tabIndex={-1} inert={gate === "closed" || gate === "opening"}>
      <div className="siger-reading">
        <section className="siger-section siger-hero" aria-labelledby="siger-hero-title">
          <div className="siger-seal" aria-hidden="true">{initials}</div>
          <p className="siger-kicker">Siger Priangan</p>
          <h1 id="siger-hero-title">{coupleName}</h1>
          <p className="siger-date-line">{date}</p>
          <div className="siger-rule" aria-hidden="true" />
          <p className="siger-lede">Dengan hangat kami mengundang Anda untuk merayakan hari pernikahan kami.</p>
          <div className="siger-scene siger-scene-opening" aria-hidden="true" />
        </section>
        {data.sections.couple && <section className="siger-section siger-couple-section" aria-labelledby="siger-couple-title">
          <p className="siger-kicker">Dua cerita, satu perjalanan</p><h2 id="siger-couple-title">Mempelai</h2>
          <div className="siger-scene siger-scene-pair" aria-hidden="true" />
          <div className="siger-pair-stage">
            <div className="siger-profiles"><Profile person={groom} label="Mempelai" index={1} /><Profile person={bride} label="Mempelai" index={2} /></div>
            <div className="siger-pair-fold siger-pair-fold-left" aria-hidden="true" /><div className="siger-pair-fold siger-pair-fold-right" aria-hidden="true" />
          </div>
          {(data.greeting || data.prayer) && <div className="siger-message">{data.greeting && <p>{data.greeting}</p>}{data.prayer && <p>{data.prayer}</p>}</div>}
        </section>}
        {chapterImage && <section className="siger-photo-chapter" aria-label={`Potret ${coupleName}`}>
          <div className="siger-photo-stage">
            <div className="siger-photo-frame"><Image src={chapterImage} alt={chapterAlt} fill sizes="(max-width: 760px) 100vw, 760px" className="siger-photo-chapter-image" loading="lazy" /></div>
            <div className="siger-photo-shutter siger-photo-shutter-left" aria-hidden="true" />
            <div className="siger-photo-shutter siger-photo-shutter-right" aria-hidden="true" />
            <div className="siger-photo-overlay"><span>Sebuah perjalanan</span><strong>{coupleName}</strong><span>{date}</span></div>
          </div>
        </section>}
        {data.sections.events && data.events.length > 0 && <section className="siger-section siger-events-section" aria-labelledby="siger-events-title">
          <p className="siger-kicker">Hari bahagia</p><h2 id="siger-events-title">Rangkaian Acara</h2>
          <div className="siger-event-stage"><div className="siger-scene siger-scene-schedule" aria-hidden="true" />
          <div className="siger-event-paper-veil" aria-hidden="true" />
          <div className="siger-events">{data.events.map((event, index) => <article className="siger-event" key={`${event.name}-${index}`}>
            <header className="siger-event-heading"><span className="siger-event-index">0{index + 1} / Acara</span><h3>{event.name}</h3></header>
            <div className="siger-event-schedule">
              <div className="siger-event-when"><p className="siger-event-date">{event.date}</p><p className="siger-event-time">{event.time}</p></div>
              <div className="siger-event-place"><strong>{event.location}</strong><address>{event.address}</address></div>
            </div>
            {event.mapLink && <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="siger-inline-link">Lihat lokasi ↗</a>}
          </article>)}</div></div>
        </section>}
        {data.sections.loveStory && !!data.loveStory?.length && <section className="siger-section siger-story-section" aria-labelledby="siger-story-title">
          <p className="siger-kicker">Jejak yang kami simpan</p><h2 id="siger-story-title">Kisah Kami</h2>
          <div className="siger-scene siger-scene-spine" aria-hidden="true" />
          <div className="siger-story-unfurl" aria-hidden="true" />
          <div className="siger-stories">{data.loveStory.map((story, index) => <article className="siger-story" key={`${story.title}-${index}`}><span>0{index + 1}</span><div><h3>{story.title}</h3><p>{story.content}</p></div></article>)}</div>
        </section>}
        {data.sections.gallery && !!data.gallery?.items.length && <section className="siger-section siger-gallery-section" aria-labelledby="siger-gallery-title">
          <p className="siger-kicker">Album pasangan</p><h2 id="siger-gallery-title">Galeri</h2>
          <div className="siger-scene siger-scene-album" aria-hidden="true" />
          <div className="siger-album-stage"><div className="siger-gallery">{data.gallery.items.map((item, index) => <figure key={`${item.url}-${index}`}><span className="siger-gallery-mat" aria-hidden="true" /><div className="siger-gallery-frame">{item.url ? <Image src={item.url} alt={item.altText} fill sizes="(max-width: 600px) 85vw, (max-width: 900px) 45vw, 300px" className="siger-gallery-image" loading="lazy" /> : <span className="siger-gallery-placeholder">Foto belum tersedia</span>}</div>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div><div className="siger-album-cover" aria-hidden="true"><span>{initials}</span></div></div>
        </section>}
        {data.sections.gifts && !!data.gifts?.length && <section className="siger-section siger-gifts" aria-labelledby="siger-gifts-title">
          <p className="siger-kicker">Tanda kasih</p><h2 id="siger-gifts-title">Hadiah</h2><p>Kehadiran Anda adalah hadiah terbaik. Bila berkenan, Anda juga dapat mengirim tanda kasih.</p>
          <div className="siger-gift-list">{data.gifts.map((gift, index) => <article className="siger-gift" key={`${gift.platform}-${index}`}><strong>{gift.platform} · {gift.accountHolder}</strong><p>{gift.accountNumber}</p><button type="button" className="siger-outline-button" disabled={isPreview} onClick={() => copyAccount(gift.accountNumber)}>{isPreview ? "Pratinjau saja" : copied === gift.accountNumber ? "Tersalin" : "Salin nomor"}</button></article>)}</div>
        </section>}
        {data.sections.wishes && <SigerWishes invitationSlug={invitationSlug} isPreview={isPreview} />}
        <section className="siger-section siger-closing" aria-labelledby="siger-closing-title"><div className="siger-scene siger-scene-ending" aria-hidden="true" /><div className="siger-seal" aria-hidden="true">{initials}</div><p className="siger-kicker">Terima kasih</p><h2 id="siger-closing-title">Sampai bertemu</h2><p>Doa baik Anda berarti banyak bagi kami.</p><div className="siger-rule" aria-hidden="true" /><p className="siger-closing-names">{coupleName}</p></section>
      </div>
    </main>
  </div>;
}
