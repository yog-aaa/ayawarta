"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/config/landing";

type HeaderProps = {
  logoUrl?: string;
};

export default function Header({ logoUrl = "/images/logo.png" }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const sectionIds = useMemo(
    () => NAV_LINKS.map((link) => link.id),
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );

    sectionIds.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  // Escape key close handler and focus return
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 font-sans shadow-md backdrop-blur-xl transition-[background-color,box-shadow] duration-300">
      <div className="container mx-auto px-4 sm:px-8 lg:px-16 py-4">
        <div className="flex items-center justify-between">
          <a href="#home" className="relative h-10 w-32 sm:w-36 focus-ring rounded-md">
            <Image
              src={logoUrl}
              alt="Logo AyaWarta"
              fill
              sizes="(min-width: 640px) 144px, 128px"
              className="object-contain"
              priority
            />
          </a>

          <nav className="hidden items-center md:flex" aria-label="Navigasi Utama">
            <ul className="flex items-center gap-8 lg:gap-10 font-medium text-gray-600 text-sm lg:text-base">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`nav-link-hover transition-colors duration-300 hover:text-blue-600 focus-ring rounded-md px-1 py-1 ${
                        isActive ? "text-blue-600 font-semibold active" : ""
                      }`}
                    >
                      {link.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="md:hidden">
            <button
              ref={toggleButtonRef}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:text-blue-600 focus-ring transition-colors"
              aria-label={isMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-nav-menu"
          className="border-t border-gray-100 bg-white pb-4 md:hidden"
          aria-label="Navigasi Mobile"
        >
          <ul className="space-y-2 px-4 sm:px-8 py-2">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <li key={link.name}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={handleLinkClick}
                    className={`block py-3 px-3 rounded-md font-medium transition-colors focus-ring ${
                      isActive
                        ? "text-blue-600 bg-blue-50 font-semibold"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                    }`}
                  >
                    {link.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
