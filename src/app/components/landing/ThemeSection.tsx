"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { SHOWCASE_THEMES, THEME_CATEGORIES, type ThemeCategory } from "@/config/landing";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { Container } from "@/components/ui/Container";

export default function ThemeSection() {
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>("Semua");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredThemes = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("id-ID");

    return SHOWCASE_THEMES.filter((theme) => {
      const matchesCategory =
        activeCategory === "Semua" || theme.category === activeCategory;
      const matchesSearch =
        !query ||
        [theme.title, theme.colorName, theme.code]
          .join(" ")
          .toLocaleLowerCase("id-ID")
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  return (
    <section
      id="tema"
      className="scroll-mt-20 lg:scroll-mt-24 bg-brand-soft py-20 lg:py-28"
    >
      <Container>
        <AnimateIn className="mx-auto mb-10 max-w-3xl text-center lg:mb-14">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-brand-primary">
            Koleksi AyaWarta
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-secondary sm:text-4xl lg:text-5xl">
            Berbagai Jenis <span className="font-heading font-normal italic">Tema</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Setiap momen memiliki jiwa dan ceritanya sendiri. Jelajahi warna
            Classic Rose yang sudah tersedia dan lihat langsung undangannya.
          </p>
        </AnimateIn>

        <div className="mb-8 rounded-[1.75rem] border border-brand-secondary/10 bg-white p-4 shadow-subtle sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kategori tema">
              {THEME_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={`focus-ring min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] ${
                    activeCategory === category
                      ? "bg-brand-secondary text-white shadow-card"
                      : "bg-brand-soft text-brand-secondary hover:bg-blue-100"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="relative w-full shrink-0 lg:w-64">
              <label htmlFor="theme-search" className="sr-only">
                Cari template undangan
              </label>
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-secondary/50"
                aria-hidden="true"
              />
              <input
                id="theme-search"
                name="search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Cari warna atau kode tema"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="focus-ring min-h-11 w-full rounded-full border border-brand-secondary/15 bg-brand-soft py-2 pl-11 pr-4 text-sm text-brand-secondary placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {filteredThemes.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {filteredThemes.map((theme, index) => (
              <AnimateIn key={theme.id} delay={Math.min(index * 0.06, 0.24)}>
                <article className="group overflow-hidden rounded-[1.6rem] border border-brand-secondary/10 bg-white shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-floating">
                  <Link
                    href={theme.href}
                    className="focus-ring relative block aspect-[4/4.4] overflow-hidden bg-white"
                    aria-label={`Lihat pratinjau tema ${theme.title} ${theme.colorName}`}
                  >
                    <Image
                      src={theme.backgroundSrc}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 390px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-7 top-7 h-[52%]">
                      <Image
                        src={theme.flowerSrc}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 40vw, 80vw"
                        className="object-contain object-top"
                      />
                    </div>
                    <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/85 px-4 py-4 text-center shadow-card backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-secondary/65">
                        Undangan pernikahan
                      </p>
                      <p
                        className="mt-1 font-heading text-2xl italic sm:text-3xl"
                        style={{ color: theme.accent }}
                      >
                        Classic Rose
                      </p>
                      <p className="mt-1 text-xs font-semibold text-brand-secondary/70">
                        Varian {theme.colorName}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-brand-secondary">
                        {theme.title} · {theme.colorName}
                      </p>
                      <p className="mt-1 text-xs font-medium tracking-[0.12em] text-muted-foreground">
                        {theme.code}
                      </p>
                    </div>
                    <Link
                      href={theme.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
                      aria-label={`Buka pratinjau tema ${theme.title} ${theme.colorName} di tab baru`}
                    >
                      Preview <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </AnimateIn>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-brand-secondary/20 bg-white px-6 py-14 text-center">
            <p className="font-heading text-2xl italic text-brand-secondary">
              Cerita berikutnya sedang disiapkan.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Belum ada tema yang cocok dengan pilihanmu. Coba kategori lain
              atau cari warna Classic Rose.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
