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
  clock: <Clock size={32} className="text-white" aria-hidden="true" />,
  gift: <Gift size={32} className="text-white" aria-hidden="true" />,
  users: <Users size={32} className="text-white" aria-hidden="true" />,
  message: <MessageSquareQuote size={32} className="text-white" aria-hidden="true" />,
  calendar: <CalendarDays size={32} className="text-white" aria-hidden="true" />,
  "map-pin": <MapPin size={32} className="text-white" aria-hidden="true" />,
};

export default function FeatureSection() {
  return (
    <section
      id="fitur"
      className="bg-white py-20 lg:py-32 scroll-mt-20 lg:scroll-mt-24"
    >
      <Container>
        <AnimateIn direction="up">
          <SectionHeader
            title="Fitur-Fitur untuk Momen Terbaikmu"
            subtitle="Di sini, kamu pilih bisa desain, sebar undangan, dan lihat siapa aja yang datang, semuanya dari satu tempat."
          />
        </AnimateIn>

        <div className="relative flex items-center justify-center">
          <AnimateIn
            direction="left"
            className="absolute left-0 top-1/2 z-20 hidden h-[600px] w-[300px] -translate-y-1/2 lg:block -rotate-10"
          >
            <Image
              src={FEATURE_ASSETS.phoneFeature}
              alt="Tampilan antarmuka fitur undangan digital di layar smartphone"
              fill
              className="object-contain"
            />
          </AnimateIn>

          <AnimateIn
            direction="none"
            className="relative z-10 w-full max-w-5xl rounded-[40px] p-8 md:p-12 lg:pl-48"
          >
            <Image
              src={FEATURE_ASSETS.bgBlueFeature}
              alt=""
              fill
              aria-hidden="true"
              className="rounded-[40px] object-cover"
            />

            <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-12">
              {FEATURES_DATA.map((feature, index) => (
                <AnimateIn
                  key={feature.title}
                  direction="up"
                  delay={index * 0.1}
                  className="flex items-start gap-4 text-white"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2 backdrop-blur-sm">
                    {ICON_MAP[feature.iconName]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                    <p className="mt-1 text-sm text-blue-100">
                      {feature.description}
                    </p>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </AnimateIn>
        </div>
      </Container>
    </section>
  );
}
