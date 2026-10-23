import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";
import { FOOTER_CONFIG, SOCIAL_LINKS } from "@/config/landing";

export default function Footer() {
  return (
    <footer id="tentang" className="relative bg-gray-50 scroll-mt-20 lg:scroll-mt-24" aria-label="Informasi Tentang AyaWarta">
      <div className="absolute inset-0 h-full w-full pointer-events-none">
        <Image
          src="/images/landing/BG footer.svg"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover"
        />
      </div>

      <div className="relative z-10 container mx-auto px-6 sm:px-8 pb-16 pt-48 text-white">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-2 lg:col-span-1">
            <h2 className="text-3xl font-bold">{FOOTER_CONFIG.brandName}</h2>
            <p className="mt-1 text-white/80">{FOOTER_CONFIG.tagline}</p>
            <h3 className="mb-4 mt-10 text-xl font-bold">{FOOTER_CONFIG.aboutHeading}</h3>
            {FOOTER_CONFIG.aboutParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className={`text-sm leading-relaxed text-white/80 ${
                  index > 0 ? "mt-4" : ""
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div className="lg:pl-8">
            <h3 className="mb-6 text-xl font-bold">Kontak</h3>
            <ul className="space-y-4" aria-label="Informasi kontak">
              <li className="flex items-start gap-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-white/80" aria-hidden="true">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="text-sm text-white/80">{FOOTER_CONFIG.contact.address}</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-white/80" aria-hidden="true">
                  <Phone className="h-5 w-5" />
                </span>
                <a
                  href={`tel:${FOOTER_CONFIG.contact.phone.replace(/\s+/g, "")}`}
                  className="text-sm text-white/80 hover:text-white transition-colors focus-ring rounded"
                >
                  {FOOTER_CONFIG.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-4">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-white/80" aria-hidden="true">
                  <Mail className="h-5 w-5" />
                </span>
                <a
                  href={`mailto:${FOOTER_CONFIG.contact.email}`}
                  className="text-sm text-white/80 hover:text-white transition-colors focus-ring rounded"
                >
                  {FOOTER_CONFIG.contact.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-6 text-xl font-bold">Ikuti Kami</h3>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={`Ikuti kami di ${social.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0D285B] transition-[background-color,transform] duration-300 hover:scale-110 hover:bg-gray-200 focus-ring"
                >
                  <div className="relative h-6 w-6">
                    <Image
                      src={social.icon}
                      alt=""
                      aria-hidden="true"
                      fill
                      className="object-contain"
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/20 pt-8 text-center text-xs text-white/60">
          <p>© {new Date().getFullYear()} AyaWarta. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
