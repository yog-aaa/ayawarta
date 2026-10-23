"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link as LinkIcon, MessageSquare, Users } from "lucide-react";

import type { InvitationData } from "@/features/invitations/types";

export interface InviteClientViewProps {
  slug: string;
  invitationData: InvitationData;
}

const buildInvitationMessage = (
  name: string,
  invitationData: InvitationData,
  invitationUrl: string
) => {
  const { couple, events } = invitationData;
  const reception = events && events.length > 0 ? events[events.length - 1] : undefined;

  return `بِسْــــــــــــــمِ اللهِ الرَّحْمَنِ الرَّحِيْـــــم

💐 UNDANGAN PERNIKAHAN 💐

Kepada Yth:
${name}

Segala puji bagi Allah SWT yang telah menciptakan makhluk-Nya berpasang-pasangan. Dengan ini kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami :

*${couple.bride.name}*
${couple.bride.parents}

dengan

*${couple.groom.name}*
${couple.groom.parents}

Insyaa Allah yang akan diselenggarakan pada:
*${reception?.date ?? ""}*

🏢 *Tempat Acara*
${reception?.location ?? ""}
${reception?.address ?? ""}

Klik link berikut untuk Undangan Resmi
${invitationUrl}

Merupakan suatu kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan do'a terbaiknya.
Jazaakumullah Khairan Katsiran
💌
Wedding E-Invitation ini merupakan undangan resmi dari kami, kami mohon maaf mengirim undangan melalui online.`;
};

export default function InviteClientView({
  slug,
  invitationData,
}: InviteClientViewProps) {
  const [namesInput, setNamesInput] = useState("");
  const [guestList, setGuestList] = useState<string[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const guestLinks = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const baseUrl = origin ? `${origin}/${slug}` : `/${slug}`;
    return guestList.map((name) => ({
      name,
      url: `${baseUrl}?to=${encodeURIComponent(name)}`,
    }));
  }, [guestList, slug]);

  const handleGenerateLinks = () => {
    const names = namesInput
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    setGuestList(names);
  };

  const copyText = async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  const handleCopy = async (name: string, url: string) => {
    try {
      await copyText(url);
      setCopiedName(name);
      window.setTimeout(() => setCopiedName(null), 2000);
    } catch (error) {
      console.error("Gagal menyalin link", error);
    }
  };

  const handleShareToWhatsApp = (name: string, url: string) => {
    const message = buildInvitationMessage(name, invitationData, url);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-body">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Buat Link Undangan</h1>
            <p className="mt-2 text-gray-500">
              Untuk pernikahan{" "}
              <span className="font-semibold text-gray-700">
                {invitationData.couple.groom.name} & {invitationData.couple.bride.name}
              </span>
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="names" className="mb-2 block text-sm font-semibold text-gray-700">
              <Users className="mr-2 inline-block h-4 w-4" />
              Nama Tamu (satu nama per baris)
            </label>
            <textarea
              id="names"
              rows={5}
              value={namesInput}
              onChange={(event) => setNamesInput(event.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh:&#10;John Doe&#10;Jane Smith&#10;Keluarga Besar Bapak Budi"
            />
          </div>

          <button
            onClick={handleGenerateLinks}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-blue-700"
          >
            <LinkIcon className="h-5 w-5" />
            Buat Link
          </button>

          {guestLinks.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-center text-xl font-bold text-gray-800">
                Hasil Link Undangan
              </h2>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="sticky top-0 bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Nama Tamu
                      </th>
                      <th scope="col" className="px-6 py-3 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestLinks.map(({ name, url }) => (
                      <tr key={name} className="border-b bg-white hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                          {name}
                        </td>
                        <td className="space-x-2 px-6 py-4 text-right">
                          <button
                            onClick={() => handleCopy(name, url)}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
                              copiedName === name
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {copiedName === name ? (
                              <>
                                <Check className="h-3 w-3" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Salin
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleShareToWhatsApp(name, url)}
                            title="Bagikan ke WhatsApp"
                            className="inline-flex items-center gap-2 rounded-md bg-green-100 px-3 py-2 text-xs font-semibold text-green-800 transition hover:bg-green-200"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} AyaWarta. Fitur dibuat oleh Programmer Berkelas.
        </p>
      </div>
    </main>
  );
}
