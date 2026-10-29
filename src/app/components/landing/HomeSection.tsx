"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageCircle, Pause, Play } from "lucide-react";
import { HERO_CONFIG } from "@/config/landing";
import {
  createFadeInUp,
  createStaggerContainer,
} from "@/lib/motion";
import { Button } from "@/components/ui/Button";

export default function HomeSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const shouldReduceMotion = Boolean(useReducedMotion());

  const containerVariants = createStaggerContainer(0.2, 0.3, shouldReduceMotion);
  const itemVariants = createFadeInUp(shouldReduceMotion);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_CONFIG.sliderImages.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide(
      (prev) =>
        (prev - 1 + HERO_CONFIG.sliderImages.length) %
        HERO_CONFIG.sliderImages.length
    );
  };

  // Autoplay is stopped completely when reduced motion is preferred or user pauses
  useEffect(() => {
    if (shouldReduceMotion || isAutoplayPaused) return;
    const slideInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(slideInterval);
  }, [nextSlide, isAutoplayPaused, shouldReduceMotion]);

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden bg-brand-soft scroll-mt-20 lg:scroll-mt-24"
    >
      <div className="relative flex flex-col">
        {/* Content Container */}
        <div className="mx-auto grid w-full max-w-[var(--content-width-default)] items-center gap-8 px-4 pt-10 sm:px-8 sm:pt-14 lg:min-h-[650px] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-4 lg:px-16 lg:pt-8">
          {/* Left Content */}
          <div className="relative z-10 flex w-full min-w-0 flex-col justify-center py-4 lg:py-10">
            <motion.div
              className="text-center lg:text-left"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h1
                className="text-[clamp(2.35rem,4.3vw,4.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-foreground"
                variants={itemVariants}
              >
                <span className="mb-6 flex items-center justify-center gap-3 text-base font-semibold tracking-normal text-brand-secondary lg:justify-start">
                  <span className="font-heading text-2xl font-bold">{HERO_CONFIG.brandName}</span>
                  <span aria-hidden="true" className="h-px w-10 bg-brand-primary/60" />
                </span>
                <span className="block">{HERO_CONFIG.headlineLead}</span>
                <span className="block text-brand-primary">
                  {HERO_CONFIG.headlineEmphasis}{" "}
                  <span className="font-heading font-normal italic text-brand-secondary">
                    {HERO_CONFIG.headlineStory}
                  </span>
                </span>
              </motion.h1>

              <motion.p
                className="mx-auto mb-8 mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-8 lg:mx-0 lg:mb-9 lg:mt-7 lg:text-xl"
                variants={itemVariants}
              >
                {HERO_CONFIG.description}
              </motion.p>

              {/* CTAs: Full width and stacked on narrow mobile (<640px), horizontal on tablet+ */}
              <motion.div
                className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:justify-start"
                variants={itemVariants}
              >
                <Button
                  variant="primary"
                  size="md"
                  href="#fitur"
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  {HERO_CONFIG.primaryCtaText}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  href="#tentang"
                  className="w-full sm:w-auto gap-2 whitespace-nowrap"
                >
                  <MessageCircle size={18} className="sm:h-5 sm:w-5" />
                  {HERO_CONFIG.secondaryCtaText}
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Content - the slide is nested inside one responsive device frame. */}
          <motion.div
            className="relative isolate flex w-full min-w-0 flex-col items-center justify-center pb-12 pt-3 sm:pb-14 lg:py-6"
            initial={{ x: shouldReduceMotion ? 0 : 56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0.01 : 0.8,
              ease: "easeOut",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 mx-auto w-full max-w-[530px] opacity-80 sm:opacity-90"
              aria-hidden="true"
            >
              <Image
                src="/images/landing/hero-ambient-v2.png"
                alt=""
                fill
                className="object-contain object-center"
                sizes="(min-width: 1024px) 530px, 100vw"
              />
            </div>

            <div
              data-testid="hero-phone-frame"
              className="relative z-10 w-[min(65vw,284px)] rounded-[2.7rem] bg-[#111b2d] p-[7px] shadow-[0_28px_70px_rgba(13,40,91,0.24)] ring-1 ring-white/80 sm:w-[270px] lg:w-[284px]"
            >
              <div className="rounded-[2.3rem] bg-[#0b1322] p-[4px]">
                <div
                  data-testid="hero-phone-screen"
                  className="relative aspect-[720/1538] overflow-hidden rounded-[2rem] bg-[#e7dec8]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentSlide}
                      className="absolute inset-0 overflow-hidden"
                      initial={{
                        opacity: 0,
                        x: shouldReduceMotion ? "0%" : "100%",
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: shouldReduceMotion ? "0%" : "-100%",
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0.01 : 0.6,
                        ease: "easeInOut",
                      }}
                    >
                      <Image
                        src={HERO_CONFIG.sliderImages[currentSlide]}
                        alt={`Contoh desain template undangan ${currentSlide + 1}`}
                        fill
                        className="object-cover object-center"
                        sizes="(min-width: 1024px) 270px, (min-width: 640px) 256px, 65vw"
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 z-20 h-[18px] w-20 -translate-x-1/2 rounded-b-2xl bg-[#0b1322]"
                  />
                </div>
              </div>
            </div>

            {/* Slider controls are grouped below the phone at every viewport. */}
            <div
              className="relative z-10 mt-5 flex items-center gap-3 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-card backdrop-blur-sm"
              role="group"
              aria-label="Kontrol pratinjau undangan"
            >
                <button
                  onClick={prevSlide}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-brand-secondary transition-[background-color,transform] hover:bg-brand-soft active:scale-95"
                  aria-label="Slide sebelumnya"
                  title="Slide sebelumnya"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="min-w-14 text-center text-xs font-semibold tracking-widest text-brand-secondary tabular-nums" aria-hidden="true">
                  {String(currentSlide + 1).padStart(2, "0")} /{" "}
                  {String(HERO_CONFIG.sliderImages.length).padStart(2, "0")}
                </span>
                {/* Persistent user-operable pause/resume button with truthful reduced-motion state */}
                <button
                  onClick={
                    shouldReduceMotion
                      ? undefined
                      : () => setIsAutoplayPaused((prev) => !prev)
                  }
                  disabled={shouldReduceMotion}
                  aria-disabled={shouldReduceMotion ? "true" : undefined}
                  className={`focus-ring flex h-11 w-11 items-center justify-center rounded-full text-brand-secondary transition-[background-color,transform] ${
                    shouldReduceMotion
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-brand-soft active:scale-95 cursor-pointer"
                  }`}
                  aria-label={
                    shouldReduceMotion
                      ? "Putar otomatis dinonaktifkan karena preferensi gerak dikurangi"
                      : isAutoplayPaused
                      ? "Lanjutkan putar otomatis"
                      : "Jeda putar otomatis"
                  }
                  title={
                    shouldReduceMotion
                      ? "Putar otomatis dinonaktifkan karena preferensi gerak dikurangi"
                      : isAutoplayPaused
                      ? "Lanjutkan putar otomatis"
                      : "Jeda putar otomatis"
                  }
                >
                  {shouldReduceMotion ? (
                    <Pause size={18} />
                  ) : isAutoplayPaused ? (
                    <Play size={18} />
                  ) : (
                    <Pause size={18} />
                  )}
                </button>

                <button
                  onClick={nextSlide}
                  className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-brand-secondary transition-[background-color,transform] hover:bg-brand-soft active:scale-95"
                  aria-label="Slide berikutnya"
                  title="Slide berikutnya"
                >
                  <ChevronRight size={20} />
                </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
