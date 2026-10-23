"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Search,
} from "lucide-react";
import { THEME_CATEGORIES, DUMMY_THEMES, type ThemeCategory } from "@/config/landing";
import { FramedImage } from "@/components/ui/FramedImage";

const COLOR_OPTIONS = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33A1",
  "#A133FF",
  "#33FFA1",
  "#FFC300",
  "#C70039",
] as const;

const ITEMS_PER_PAGE = 8;

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <button
        title="Halaman Sebelumnya"
        aria-label="Halaman Sebelumnya"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-11 w-11 items-center justify-center rounded-md bg-white p-2 shadow-sm transition-[background-color,opacity] disabled:opacity-50 focus-ring cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="font-medium text-gray-600 px-2">
        Halaman {currentPage} dari {totalPages}
      </span>
      <button
        title="Halaman Berikutnya"
        aria-label="Halaman Berikutnya"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-11 w-11 items-center justify-center rounded-md bg-white p-2 shadow-sm transition-[background-color,opacity] disabled:opacity-50 focus-ring cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default function ThemeSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleCategoryChange = (category: ThemeCategory) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const filteredThemes = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return DUMMY_THEMES.filter((theme) => {
      const matchesCategory =
        activeCategory === "Semua" || theme.category === activeCategory;
      const matchesSearch =
        theme.title.toLowerCase().includes(normalizedSearch) ||
        theme.code.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const totalPages = Math.ceil(filteredThemes.length / ITEMS_PER_PAGE);

  const paginatedThemes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredThemes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredThemes, currentPage]);

  return (
    <section
      id="tema"
      className="bg-gray-50 py-20 lg:py-32 scroll-mt-20 lg:scroll-mt-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-800 lg:text-4xl">
            {isExpanded ? (
              "Pilih Tema Yang Kamu Mau"
            ) : (
              <>
                Berbagai Jenis <span className="text-blue-600">Tema</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-500">
            {!isExpanded &&
              "Setiap momen memiliki jiwa dan ceritanya sendiri. Oleh karena itu, kami menghadirkan koleksi desain yang beragam untuk mewakili setiap gaya."}
          </p>
        </motion.div>

        {/* Categories Chips: Always Visible */}
        <div className="mb-12 flex flex-wrap justify-center gap-2 md:gap-3">
          {THEME_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`rounded-full px-4 py-2 text-sm font-semibold min-h-[44px] transition-[background-color,color] duration-300 md:text-base focus-ring cursor-pointer ${
                activeCategory === category
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="mx-auto mb-12 max-w-2xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="relative mb-4">
                <label htmlFor="theme-search" className="sr-only">
                  Cari template undangan
                </label>
                <input
                  type="search"
                  name="search"
                  id="theme-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Cari tema (contoh: Aquatic atau 123456)"
                  value={searchTerm}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 min-h-[44px] transition-[border-color,box-shadow] focus:border-blue-500 focus-ring"
                />
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                  aria-hidden="true"
                />
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-600">
                  Pilih Warna Yang Kamu Suka:
                </p>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      disabled
                      aria-disabled="true"
                      title="Filter warna segera hadir"
                      aria-label="Filter warna segera hadir"
                      className="flex h-11 w-11 items-center justify-center p-2 rounded-full focus-ring opacity-70 cursor-not-allowed"
                    >
                      <span
                        style={{ backgroundColor: color }}
                        className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Themes Grid: 2 cols on mobile, 3 on md (768px), 4 on lg (1024px+) */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
          {paginatedThemes.map((theme, index) => (
            <motion.div
              key={theme.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <FramedImage
                  src={theme.imageSrc}
                  alt={`Pratinjau tema ${theme.title}`}
                  fill={true}
                  aspectRatio="portrait"
                  rounded="none"
                  imageClassName="transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-grow flex-col p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-700">
                    {theme.title} ({theme.code})
                  </p>
                  <a
                    href="/wedding/classic-rose/red"
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Buka pratinjau tema ${theme.title} di tab baru`}
                    aria-label={`Buka pratinjau tema ${theme.title} di tab baru`}
                    className="shrink-0 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center focus-ring rounded"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                  </a>
                </div>
                {/* Always-visible baseline action controls */}
                <div className="mt-auto flex items-center gap-2">
                  <Link
                    href="/wedding/classic-rose/red"
                    className="flex flex-grow items-center justify-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-800 min-h-[44px] transition-[background-color,color] hover:bg-gray-200 focus-ring cursor-pointer"
                    aria-label={`Lihat pratinjau tema ${theme.title}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Preview</span>
                  </Link>
                  <button
                    disabled
                    aria-disabled="true"
                    className="shrink-0 rounded-full bg-blue-100 p-2 text-blue-600 min-h-[44px] min-w-[44px] flex items-center justify-center opacity-60 cursor-not-allowed focus-ring"
                    title="Fitur simpan tema segera hadir"
                    aria-label="Simpan tema (segera hadir)"
                  >
                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {isExpanded ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : (
          <div className="mt-16 text-center">
            <button
              onClick={() => setIsExpanded(true)}
              className="rounded-lg bg-blue-600 px-8 py-3.5 text-lg font-bold text-white min-h-[48px] shadow-lg transition-[background-color,transform] duration-200 hover:scale-105 hover:bg-blue-700 focus-ring cursor-pointer"
            >
              Tampilkan Tema Lainnya
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
