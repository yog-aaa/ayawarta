"use client";

import { useEffect, useState, type FormEvent } from "react";
import { defaultFirebaseWishesAdapter } from "@/features/wishes/firebase-adapter";
import { validateWishInput } from "@/features/wishes/validation";
import type { Wish, WishesGateway, WriteAttendance } from "@/features/wishes";

export default function SigerLiveWishes({ invitationSlug, gateway = defaultFirebaseWishesAdapter }: {
  invitationSlug: string;
  gateway?: WishesGateway;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<WriteAttendance | "">("");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const unsubscribe = gateway.subscribe(invitationSlug, (snapshot) => {
      if (!active) return;
      setWishes(snapshot.wishes);
      setStatus("ready");
    }, () => { if (active) setStatus("error"); });
    return () => { active = false; unsubscribe(); };
  }, [gateway, invitationSlug, retry]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let input;
    try {
      input = validateWishInput({ name, message, attendance: attendance as WriteAttendance });
    } catch {
      setFeedback("Isi nama, ucapan, dan pilihan kehadiran dengan benar.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      await gateway.submitWish(invitationSlug, input);
      setName(""); setMessage(""); setAttendance("");
      setFeedback("Konfirmasi dan ucapan berhasil dikirim.");
    } catch {
      setFeedback("Ucapan belum terkirim. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="siger-section siger-wishes" aria-labelledby="siger-wishes-title">
    <p className="siger-kicker">Kami menantikan Anda</p>
    <h2 id="siger-wishes-title">Konfirmasi &amp; Ucapan</h2>
      <form className="siger-wishes-form" onSubmit={submit}>
        <label htmlFor="siger-wish-name">Nama tamu</label>
        <input id="siger-wish-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
        <fieldset>
          <legend>Konfirmasi kehadiran</legend>
          <div className="siger-choice-row">
            {(["Hadir", "Tidak Hadir"] as const).map((value) => <label key={value} className="siger-choice">
              <input type="radio" name="attendance" value={value} checked={attendance === value} onChange={() => setAttendance(value)} required />
              <span>{value}</span>
            </label>)}
          </div>
        </fieldset>
        <label htmlFor="siger-wish-message">Ucapan</label>
        <textarea id="siger-wish-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} required />
        {feedback && <p role="status" className="siger-form-feedback">{feedback}</p>}
        <button type="submit" disabled={busy} className="siger-button">{busy ? "Mengirim…" : "Kirim konfirmasi"}</button>
      </form>
      <div className="siger-wish-list" aria-live="polite">
        {status === "loading" && <p>Memuat ucapan…</p>}
        {status === "error" && <div role="alert"><p>Ucapan belum dapat dimuat.</p><button className="siger-text-button" type="button" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>Coba lagi</button></div>}
        {status === "ready" && wishes.length === 0 && <p>Belum ada ucapan. Jadilah yang pertama.</p>}
        {status === "ready" && wishes.map((wish) => <article key={wish.id} className="siger-wish-card"><strong>{wish.name}</strong><span>{wish.attendance}</span><p>{wish.message}</p></article>)}
      </div>
  </section>;
}
