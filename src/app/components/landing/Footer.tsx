import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { FOOTER_CONFIG, SOCIAL_LINKS } from "@/config/landing";
import { Container } from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer
      id="tentang"
      className="relative scroll-mt-20 lg:scroll-mt-24 overflow-hidden bg-brand-secondary text-white"
      aria-label="Informasi Tentang AyaWarta"
    >
      <div
        className="pointer-events-none absolute -right-48 -top-52 h-[650px] w-[650px] rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-[420px] w-[420px] rounded-full border border-white/10"
        aria-hidden="true"
      />

      <Container className="relative z-10 py-16 lg:py-20">
        <div className="flex flex-col gap-5 border-b border-white/20 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-blue-200">
              Mari bagikan kabar baik
            </p>
            <h2 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              {FOOTER_CONFIG.brandName}
            </h2>
          </div>
          <p className="max-w-md text-lg leading-7 text-white/80 lg:text-right">
            {FOOTER_CONFIG.tagline}
          </p>
        </div>

        <div className="grid gap-12 py-12 md:grid-cols-2 lg:grid-cols-[1.45fr_1fr_0.7fr] lg:gap-16 lg:py-16">
          <div className="max-w-lg">
            <h3 className="mb-5 text-base font-bold text-white">
              {FOOTER_CONFIG.aboutHeading}
            </h3>
            <div className="space-y-4">
              {FOOTER_CONFIG.aboutParagraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-base font-bold text-white">Kontak</h3>
            <ul className="space-y-5" aria-label="Informasi kontak">
              <li className="flex items-start gap-3 text-sm leading-6 text-white/75">
                <MapPin size={18} className="mt-1 shrink-0 text-blue-200" aria-hidden="true" />
                <span>{FOOTER_CONFIG.contact.address}</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/75">
                <Phone size={18} className="shrink-0 text-blue-200" aria-hidden="true" />
                <a
                  href={`tel:${FOOTER_CONFIG.contact.phone.replace(/\s+/g, "")}`}
                  className="focus-ring rounded hover:text-white"
                >
                  {FOOTER_CONFIG.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/75">
                <Mail size={18} className="shrink-0 text-blue-200" aria-hidden="true" />
                <a
                  href={`mailto:${FOOTER_CONFIG.contact.email}`}
                  className="focus-ring rounded hover:text-white"
                >
                  {FOOTER_CONFIG.contact.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-base font-bold text-white">Ikuti Kami</h3>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={`Ikuti kami di ${social.name}`}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-secondary shadow-subtle transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="relative h-5 w-5">
                    <Image
                      src={social.icon}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/20 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AyaWarta. All rights reserved.</p>
          <p>Undangan digital untuk setiap cerita.</p>
        </div>
      </Container>
    </footer>
  );
}
