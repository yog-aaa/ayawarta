import type { ReactNode } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Clock,
  Gift,
  MapPin,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import { FEATURES_DATA, FEATURE_ASSETS, type FeatureIconName } from "@/config/landing";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AnimateIn } from "@/components/ui/AnimateIn";

const ICON_MAP: Record<FeatureIconName, ReactNode> = {
  clock: <Clock size={24} className="text-brand-primary" aria-hidden="true" />,
  gift: <Gift size={24} className="text-brand-primary" aria-hidden="true" />,
  users: <Users size={24} className="text-brand-primary" aria-hidden="true" />,
  message: <MessageSquareQuote size={24} className="text-brand-primary" aria-hidden="true" />,
  calendar: <CalendarDays size={24} className="text-brand-primary" aria-hidden="true" />,
  "map-pin": <MapPin size={24} className="text-brand-primary" aria-hidden="true" />,
};

export default function FeatureSection() {
  return (
    <section
      id="fitur"
      className="bg-white py-20 lg:py-28 scroll-mt-20 lg:scroll-mt-24"
    >
      <Container>
        <AnimateIn direction="up">
          <SectionHeader
            title="Fitur-Fitur untuk Momen Terbaikmu"
            subtitle="Kirim detail acaramu, lalu tim AyaWarta menyiapkan undangan yang siap dibagikan dan menerima kabar kehadiran tamu."
          />
        </AnimateIn>

        <div className="grid items-center gap-6 rounded-[2rem] border border-[#dbe8f7] bg-[#f5f9ff] p-4 shadow-subtle sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8 lg:p-8">
          <AnimateIn direction="left" className="min-w-0">
            <div className="relative isolate flex h-[330px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/80 bg-[#eaf3ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-[390px] lg:h-[510px]">
              <Image
                src={FEATURE_ASSETS.bgBlueFeature}
                alt=""
                fill
                aria-hidden="true"
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover opacity-[0.16]"
              />
              <div aria-hidden="true" className="absolute inset-x-8 bottom-6 h-24 rounded-full bg-brand-primary/15 blur-3xl" />
              <div className="relative h-[92%] w-[min(78%,310px)] sm:w-[min(65%,340px)] lg:w-[min(88%,370px)]">
                <Image
                  src={FEATURE_ASSETS.phoneFeature}
                  alt="Tampilan antarmuka fitur undangan digital di layar smartphone"
                  fill
                  sizes="(min-width: 1024px) 370px, (min-width: 640px) 340px, 78vw"
                  className="object-contain drop-shadow-[0_22px_22px_rgba(13,40,91,0.18)]"
                />
              </div>
            </div>
          </AnimateIn>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:gap-4">
            {FEATURES_DATA.map((feature, index) => (
              <AnimateIn
                key={feature.title}
                direction="up"
                delay={index * 0.06}
                className="h-full min-w-0"
              >
                <div className="flex h-full items-start gap-3 rounded-2xl border border-[#e4ecf8] bg-white p-4 shadow-[0_4px_18px_rgba(13,40,91,0.035)] sm:flex-col sm:gap-4 lg:p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ff]">
                    {ICON_MAP[feature.iconName]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold leading-snug text-brand-secondary lg:text-lg">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
