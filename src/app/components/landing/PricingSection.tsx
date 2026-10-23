import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_PLANS, PAYMENT_METHODS } from "@/config/landing";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AnimateIn } from "@/components/ui/AnimateIn";

const BG_BLUE_PRICING = "/images/landing/bg-blue-pricing.png";

export default function PricingSection() {
  return (
    <section
      id="harga"
      className="bg-white py-20 lg:py-32 scroll-mt-20 lg:scroll-mt-24"
    >
      <Container>
        <AnimateIn direction="up">
          <SectionHeader
            title="Daftar Harga"
            subtitle="Kami menyediakan pilihan yang fleksibel dan transparan untuk setiap kebutuhan dan anggaran."
          />
        </AnimateIn>

        {/* Pricing Cards Container with Blue Artwork Background */}
        <div className="relative">
          <Image
            src={BG_BLUE_PRICING}
            alt=""
            fill
            aria-hidden="true"
            className="rounded-[50px] object-cover"
          />

          <div className="relative z-10 grid w-full grid-cols-1 gap-8 p-8 md:p-12 lg:grid-cols-3">
            {PRICING_PLANS.map((plan, index) => (
              <AnimateIn
                key={plan.name}
                direction="up"
                delay={index * 0.15}
                className={`relative flex flex-col rounded-3xl bg-white p-8 shadow-lg ${
                  plan.isPopular
                    ? "scale-105 border-2 border-blue-400"
                    : "border border-gray-200"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-bold text-white shadow-sm">
                    Paling Populer
                  </div>
                )}

                <h3 className="mb-4 text-xl font-bold text-blue-600">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-800">
                    Rp {plan.price}
                  </span>
                  <span className="font-medium text-gray-500">
                    {plan.period}
                  </span>
                </div>

                <ul className="mb-8 flex-grow space-y-4 text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="mr-3 mt-1 h-5 w-5 shrink-0 text-blue-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#tentang"
                  className={`flex items-center justify-center w-full rounded-lg py-3 text-lg font-bold min-h-[44px] transition-[background-color,transform] duration-200 hover:scale-105 focus-ring cursor-pointer ${
                    plan.isPopular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                  aria-label={`${plan.buttonText} untuk paket ${plan.name}`}
                >
                  {plan.buttonText}
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>

        {/* Payment Methods Section Placed Outside/Below Blue Artwork */}
        <div className="mt-20 text-center">
          <h3 className="mb-6 text-xl font-bold text-gray-700">
            Mendukung Pembayaran
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:gap-x-10">
            {PAYMENT_METHODS.map((method, index) => (
              <AnimateIn
                key={method.name}
                direction="up"
                delay={index * 0.05}
                className="relative h-8 w-16 md:h-10 md:w-20"
              >
                <Image
                  src={method.path}
                  alt={`Metode pembayaran ${method.name}`}
                  fill
                  className="object-contain"
                />
              </AnimateIn>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
