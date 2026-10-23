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
      className="relative w-full overflow-hidden bg-[#F3F6FD] pt-8 pb-0 lg:pt-10 scroll-mt-20 lg:scroll-mt-24"
    >
      <div className="relative flex flex-col lg:min-h-[calc(100svh-80px)]">
        {/* Content Container */}
        <div className="flex flex-1 flex-col lg:flex-row items-stretch overflow-hidden lg:overflow-visible">
          {/* Left Content */}
          <div className="relative z-10 w-full lg:w-[58%] px-4 sm:px-8 lg:pl-24 lg:pr-12 flex flex-col justify-center py-8 lg:py-10">
            <motion.div
              className="text-center lg:text-left"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h1
                className="mb-4 flex flex-col items-center justify-center gap-0 lg:flex-row lg:items-end lg:justify-start lg:gap-0"
                variants={itemVariants}
              >
                <div className="order-1 relative h-[126px] aspect-[1.3/1] sm:h-[156px] md:h-[192px] lg:order-1">
                  <Image
                    src={HERO_CONFIG.undanganTextImg}
                    alt="Undangan"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="order-2 relative -mt-20 h-[156px] aspect-[1/1] sm:-mt-24 sm:h-[192px] md:mt-0 md:h-[240px] lg:order-2 lg:-mb-1">
                  <Image
                    src={HERO_CONFIG.digitalTextImg}
                    alt="Digital"
                    fill
                    className="object-contain"
                  />
                </div>
              </motion.h1>

              <motion.p
                className="mx-auto mb-8 mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base md:text-lg lg:mx-0"
                variants={itemVariants}
              >
                {HERO_CONFIG.description}
              </motion.p>

              {/* CTAs: Full width and stacked on narrow mobile (<640px), horizontal on tablet+ */}
              <motion.div
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center sm:justify-start gap-3 sm:gap-4 lg:justify-start w-full sm:w-auto"
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

          {/* Right Content - Phone and Slider */}
          <motion.div
            className="hidden lg:flex relative w-full lg:w-[42%] flex-col items-stretch justify-center py-8 lg:py-0 -mr-4 sm:-mr-8 lg:-mr-[320px] max-w-full"
            initial={{ x: shouldReduceMotion ? 0 : 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0.01 : 1,
              ease: "easeOut",
            }}
          >
            <div className="relative h-[500px] sm:h-[600px] lg:h-[650px] w-full flex items-center justify-end pr-0 sm:pr-2">
              <div className="pointer-events-none relative h-full w-full">
                <Image
                  src={HERO_CONFIG.handPhoneImg}
                  alt="Ilustrasi smartphone menampilkan undangan digital"
                  fill
                  className="object-contain object-right"
                  priority
                />
              </div>

              {/* Screen Preview Inside Mockup */}
              <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-42.5 -translate-y-3/4 z-10 h-[280px] sm:h-[330px] lg:h-[420px] w-[200px] sm:w-[150px] lg:w-[195px] overflow-hidden rounded-[10px] sm:rounded-[10px] lg:rounded-[15px] bg-gray-200 shadow-lg">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentSlide}
                    className="absolute inset-0 overflow-hidden rounded-[inherit]"
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
                      sizes="(min-width: 1024px) 195px, 150px"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slider Controls: Previous, Pause/Resume, Next */}
              <div className="pointer-events-auto absolute -left-6 sm:-left-4 top-1/2 z-30 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={prevSlide}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 p-2 text-gray-800 shadow-md transition-[background-color,transform] hover:bg-white focus-ring active:scale-95"
                  aria-label="Slide sebelumnya"
                  title="Slide sebelumnya"
                >
                  <ChevronLeft size={20} className="sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="pointer-events-auto absolute right-10 sm:right-12 top-1/2 z-30 -translate-y-1/2 flex items-center gap-2">
                {/* Persistent user-operable pause/resume button with truthful reduced-motion state */}
                <button
                  onClick={
                    shouldReduceMotion
                      ? undefined
                      : () => setIsAutoplayPaused((prev) => !prev)
                  }
                  disabled={shouldReduceMotion}
                  aria-disabled={shouldReduceMotion ? "true" : undefined}
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/80 p-2 text-gray-800 shadow-md transition-[background-color,transform] focus-ring ${
                    shouldReduceMotion
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-white active:scale-95 cursor-pointer"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 p-2 text-gray-800 shadow-md transition-[background-color,transform] hover:bg-white focus-ring active:scale-95"
                  aria-label="Slide berikutnya"
                  title="Slide berikutnya"
                >
                  <ChevronRight size={20} className="sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Wave Background - Bottom Section */}
        <motion.div
          className="relative w-full mt-6 lg:mt-auto"
          initial={{ y: shouldReduceMotion ? 0 : 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0.01 : 0.8,
            delay: shouldReduceMotion ? 0 : 0.5,
          }}
        >
          <svg
            className="w-full h-auto"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0,40 Q360,0 720,40 T1440,40 L1440,120 L0,120 Z"
              fill="#0264FF"
              className="transition-[fill] duration-300"
            />
          </svg>

          {/* Avatars Section */}
          <div className="relative bg-[#0264FF] px-4 sm:px-8 lg:px-16 py-6 sm:py-8">
            <div className="container mx-auto flex items-center justify-start gap-3 sm:gap-4">
              <div className="flex -space-x-3 sm:-space-x-4">
                {HERO_CONFIG.userAvatars.map((avatar, index) => (
                  <Image
                    key={avatar}
                    src={avatar}
                    alt={`Foto profil pengguna ${index + 1}`}
                    width={40}
                    height={40}
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-3 border-white shadow-md"
                  />
                ))}
              </div>
              <p className="text-xs sm:text-sm font-medium text-white">
                {HERO_CONFIG.proofText.prefix} <br />
                <span className="font-bold">{HERO_CONFIG.proofText.count}</span> 👑
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
