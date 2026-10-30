"use client";

import Image from "next/image";
import { useState } from "react";
import type { InvitationData, Person } from "@/features/invitations/types";
import SigerWishes from "./SigerWishes";
import "../../siger-priangan.css";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
});

function Portrait({ src, name, hero = false }: { src: string; name: string; hero?: boolean }) {
  return <div className={hero ? "siger-portrait siger-portrait-hero" : "siger-portrait"}>
    {src ? <Image src={src} alt={`Foto ${name}`} fill sizes={hero ? "(max-width: 600px) 180px, 220px" : "(max-width: 600px) 80px, 120px"} className="siger-portrait-image" priority={hero} /> : <span aria-hidden="true" className="siger-portrait-empty">✧</span>}
  </div>;
}

function Profile({ person, label }: { person: Person; label: string }) {
  return <article className="siger-profile">
    <Portrait src={person.photo} name={person.name} />
    <div><p className="siger-overline">{label}</p><h3>{person.name}</h3>{person.parents && <p className="siger-muted">{person.parents}</p>}
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
  const groom = data.couple.groom;
  const bride = data.couple.bride;
  const coupleName = `${groom.name} & ${bride.name}`;
  const date = dateFormat.format(data.weddingDate);
  const initials = `${groom.name.trim()[0] || "A"}·${bride.name.trim()[0] || "W"}`;

  async function copyAccount(number: string) {
    try { await navigator.clipboard.writeText(number); setCopied(number); }
    catch { setCopied(null); }
  }

  return <div className="siger-shell">
    {isPreview && <div className="siger-preview-banner" role="status">{invitationSlug === "siger-priangan-sample" ? "Pratinjau ilustratif" : "Pratinjau draf"} · Tidak menerima konfirmasi atau ucapan</div>}
    <header className="siger-cover-stage">
      <div className="siger-cover-side siger-cover-side-left" aria-hidden="true">Sebuah cerita<br />yang menjadi<br />kenang-kenangan.</div>
      <div className="siger-cover-paper">
        <div className="siger-cover-relief" aria-hidden="true"><span /><span /><span /></div>
        <div className="siger-cover-content">
          <p className="siger-kicker">AyaWarta · Siger Priangan</p>
          <p className="siger-cover-label">Undangan Pernikahan</p>
          <Portrait src={data.couple.heroImage} name={coupleName} hero />
          <h1>{coupleName}</h1>
          <p className="siger-cover-date">{date}</p>
          {guestName && <p className="siger-cover-guest">Kepada Yth.<strong>{guestName}</strong></p>}
          <a className="siger-button siger-cover-button" href="#siger-content">Buka Undangan <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="siger-cover-side siger-cover-side-right" aria-hidden="true">Dari kertas,<br />cahaya, dan<br />cerita kita.</div>
    </header><main className="siger-content" id="siger-content">
      <div className="siger-reading">
        <section className="siger-section siger-hero" aria-labelledby="siger-hero-title">
          <div className="siger-seal" aria-hidden="true">{initials}</div>
          <p className="siger-kicker">Siger Priangan</p>
          <h1 id="siger-hero-title">{coupleName}</h1>
          <p className="siger-date-line">{date}</p>
          <div className="siger-rule" aria-hidden="true" />
          <p className="siger-lede">Dengan hangat kami mengundang Anda untuk merayakan hari pernikahan kami.</p>
        </section>
        {data.sections.couple && <section className="siger-section" aria-labelledby="siger-couple-title">
          <p className="siger-kicker">Dua cerita, satu perjalanan</p><h2 id="siger-couple-title">Mempelai</h2>
          <div className="siger-profiles"><Profile person={groom} label="Mempelai" /><Profile person={bride} label="Mempelai" /></div>
          {(data.greeting || data.prayer) && <div className="siger-message">{data.greeting && <p>{data.greeting}</p>}{data.prayer && <p>{data.prayer}</p>}</div>}
        </section>}
        {data.sections.events && data.events.length > 0 && <section className="siger-section" aria-labelledby="siger-events-title">
          <p className="siger-kicker">Hari bahagia</p><h2 id="siger-events-title">Rangkaian Acara</h2>
          <div className="siger-events">{data.events.map((event, index) => <article className="siger-event" key={`${event.name}-${index}`}>
            <span className="siger-event-index">0{index + 1} / Acara</span><h3>{event.name}</h3>
            <p className="siger-event-date">{event.date}</p><p>{event.time}</p>
            <div className="siger-rule" aria-hidden="true" /><strong>{event.location}</strong><address>{event.address}</address>
            {event.mapLink && <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="siger-inline-link">Lihat lokasi ↗</a>}
          </article>)}</div>
        </section>}
        {data.sections.loveStory && !!data.loveStory?.length && <section className="siger-section" aria-labelledby="siger-story-title">
          <p className="siger-kicker">Jejak yang kami simpan</p><h2 id="siger-story-title">Kisah Kami</h2>
          <div className="siger-stories">{data.loveStory.map((story, index) => <article className="siger-story" key={`${story.title}-${index}`}><span>0{index + 1}</span><div><h3>{story.title}</h3><p>{story.content}</p></div></article>)}</div>
        </section>}
        {data.sections.gallery && !!data.gallery?.items.length && <section className="siger-section" aria-labelledby="siger-gallery-title">
          <p className="siger-kicker">Album pasangan</p><h2 id="siger-gallery-title">Galeri</h2>
          <div className="siger-gallery">{data.gallery.items.map((item, index) => <figure key={`${item.url}-${index}`}><div className="siger-gallery-frame">{item.url ? <Image src={item.url} alt={item.altText} fill sizes="(max-width: 600px) 85vw, (max-width: 900px) 45vw, 300px" className="siger-gallery-image" loading="lazy" /> : <span className="siger-gallery-placeholder" aria-label={item.altText}>Foto pasangan</span>}</div>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div>
        </section>}
        {data.sections.gifts && !!data.gifts?.length && <section className="siger-section siger-gifts" aria-labelledby="siger-gifts-title">
          <p className="siger-kicker">Tanda kasih</p><h2 id="siger-gifts-title">Hadiah</h2><p>Kehadiran Anda adalah hadiah terbaik. Bila berkenan, Anda juga dapat mengirim tanda kasih.</p>
          <div className="siger-gift-list">{data.gifts.map((gift, index) => <article className="siger-gift" key={`${gift.platform}-${index}`}><strong>{gift.platform} · {gift.accountHolder}</strong><p>{gift.accountNumber}</p><button type="button" className="siger-outline-button" disabled={isPreview} onClick={() => copyAccount(gift.accountNumber)}>{isPreview ? "Pratinjau saja" : copied === gift.accountNumber ? "Tersalin" : "Salin nomor"}</button></article>)}</div>
        </section>}
        {data.sections.wishes && <SigerWishes invitationSlug={invitationSlug} isPreview={isPreview} />}
        <section className="siger-section siger-closing" aria-labelledby="siger-closing-title"><div className="siger-seal" aria-hidden="true">{initials}</div><p className="siger-kicker">Terima kasih</p><h2 id="siger-closing-title">Sampai bertemu</h2><p>Doa baik Anda berarti banyak bagi kami.</p><div className="siger-rule" aria-hidden="true" /><p className="siger-closing-names">{coupleName}</p></section>
      </div>
    </main>
  </div>;
}
