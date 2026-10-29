import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_PLANS, PAYMENT_METHODS } from "@/config/landing";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AnimateIn } from "@/components/ui/AnimateIn";

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function PricingSection() {
  return (
    <section
      id="harga"
      className="bg-[#f5f9ff] py-20 lg:py-28 scroll-mt-20 lg:scroll-mt-24"
    >
      <Container>
        <AnimateIn direction="up">
          <SectionHeader
            title="Pilih paket untuk momenmu"
            subtitle="Sekali bayar untuk satu acara. Tim AyaWarta menyiapkan undangan dari detail acara yang Anda kirim."
          />
        </AnimateIn>

        <div className="rounded-[2rem] border border-[#dce9f9] bg-white/70 p-4 shadow-subtle sm:p-6 lg:p-8">
          <div className="grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {PRICING_PLANS.map((plan, index) => (
              <AnimateIn
                key={plan.id}
                direction="up"
                delay={index * 0.1}
                className={`flex h-full min-w-0 flex-col rounded-[1.5rem] border bg-white p-6 shadow-[0_8px_24px_rgba(13,40,91,0.045)] lg:p-7 ${
                  plan.isRecommended
                    ? "border-brand-primary shadow-[0_12px_34px_rgba(2,100,255,0.12)]"
                    : "border-[#e2eaf6]"
                }`}
              >
                <div className="mb-5 flex h-7 items-center">
                  {plan.isRecommended && (
                    <span className="rounded-full bg-brand-secondary px-3 py-1 text-xs font-bold tracking-wide text-white">
                      Direkomendasikan
                    </span>
                  )}
                </div>

                <h3 className="mb-3 text-xl font-bold text-brand-secondary">
                  {plan.name}
                </h3>
                <p className="mb-5 min-h-12 text-sm leading-relaxed text-slate-600">
                  {plan.description}
                </p>
                <div className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap text-3xl font-extrabold leading-none tracking-tight text-brand-secondary xl:text-4xl">
                    {formatRupiah(plan.priceIdr)}
                  </span>
                  <span className="whitespace-nowrap text-sm font-medium leading-none text-slate-500">
                    / acara
                  </span>
                </div>

                <ul className="mb-8 flex-grow space-y-3 border-t border-[#e8eef8] pt-6 text-sm leading-relaxed text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#tentang"
                  className={`focus-ring flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-3 text-base font-bold transition-colors duration-200 ${
                    plan.isRecommended
                      ? "bg-brand-primary text-white hover:bg-brand-primary-hover"
                      : "bg-[#edf4ff] text-brand-secondary hover:bg-[#dfeaff]"
                  }`}
                  aria-label={`Pilih paket ${plan.name}`}
                >
                  {plan.buttonText}
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-7 max-w-3xl text-center text-sm leading-relaxed text-slate-600">
          <p>
            Semua paket tersedia dengan pilihan warna Classic Rose, tanpa watermark
            dan tanpa batas jumlah tautan yang dibagikan.
          </p>
          <p className="mt-2">
            Galeri foto tamu privat dan QR check-in direncanakan sebagai extension
            terpisah yang dapat ditambahkan ke paket mana pun.
          </p>
        </div>

        <div className="mt-12 text-center lg:mt-14">
          <h3 className="mb-5 text-base font-semibold text-brand-secondary">
            Mendukung Pembayaran
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {PAYMENT_METHODS.map((method, index) => (
              <AnimateIn
                key={method.name}
                direction="up"
                delay={index * 0.03}
                className="flex h-14 w-[88px] items-center justify-center rounded-xl border border-[#e1eaf6] bg-white px-3 shadow-[0_3px_10px_rgba(13,40,91,0.035)] sm:w-24"
              >
                <div className="relative h-8 w-full">
                  <Image
                    src={method.path}
                    alt={`Metode pembayaran ${method.name}`}
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
