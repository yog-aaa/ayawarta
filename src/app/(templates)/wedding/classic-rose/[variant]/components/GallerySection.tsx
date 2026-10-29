"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { ClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";
import type { InvitationData } from "@/features/invitations/types";
import { classicRoseCloudinaryLoader, isClassicRoseCloudinaryAsset } from "@/lib/theme-config/cloudinary-theme-loader";
import SectionDivider from "./SectionDivider";

interface GallerySectionProps {
  gallery: NonNullable<InvitationData["gallery"]>;
  theme: ClassicRoseThemeConfig;
}

function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.hostname.endsWith("youtube.com")
        ? parsed.searchParams.get("v")
        : null;
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1` : null;
  } catch {
    return null;
  }
}

export default function GallerySection({ gallery }: GallerySectionProps) {
  const [playVideo, setPlayVideo] = useState(false);
  const embedUrl = gallery.videoUrl ? getEmbedUrl(gallery.videoUrl) : null;

  return (
    <section className="relative px-4 py-20 sm:px-8 md:py-28">
      <motion.div
        className="classic-rose-surface relative z-10 mx-auto w-full max-w-3xl rounded-3xl p-4 sm:p-7"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[.3em] opacity-75">Kenangan bersama</p>
          <h2 className="mt-2 text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Momen Indah Kami
          </h2>
          <SectionDivider className="mx-auto mt-4 w-24" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {embedUrl && (
            <div className="relative col-span-2 aspect-video overflow-hidden rounded-2xl bg-black/20">
              {playVideo ? (
                <iframe
                  src={embedUrl}
                  title="Video pernikahan"
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <Image
                    src={gallery.images[0]}
                    loader={isClassicRoseCloudinaryAsset(gallery.images[0]) ? classicRoseCloudinaryLoader : undefined}
                    alt="Pratinjau video pernikahan"
                    fill
                    sizes="(max-width: 767px) 100vw, 720px"
                    quality={75}
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPlayVideo(true)}
                    aria-label="Putar video pernikahan"
                    className="absolute inset-0 flex items-center justify-center bg-black/30 text-white focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
                  >
                    <span className="flex size-16 items-center justify-center rounded-full border border-white/80 bg-black/25 text-2xl backdrop-blur-sm" aria-hidden="true">▶</span>
                  </button>
                </>
              )}
            </div>
          )}
          {gallery.images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`relative overflow-hidden rounded-2xl bg-black/10 ${index === 0 ? "col-span-2 aspect-[4/3] sm:aspect-[16/9]" : "aspect-square"}`}
            >
              <Image
                src={src}
                loader={isClassicRoseCloudinaryAsset(src) ? classicRoseCloudinaryLoader : undefined}
                alt={`Foto kenangan ${index + 1}`}
                fill
                sizes={index === 0 ? "(max-width: 767px) 100vw, 720px" : "(max-width: 767px) 50vw, 360px"}
                quality={75}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
