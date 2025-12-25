"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    // Set cookie
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    setIsOpen(false);
    // Refresh to apply new locale
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-raised)] transition-colors text-sm"
        aria-label="Select language"
      >
        <span>{localeFlags[locale]}</span>
        <span className="text-white font-medium uppercase">{locale}</span>
        <span className="material-symbols-outlined text-[var(--text-muted)] text-lg">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg shadow-xl z-50 overflow-hidden">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-overlay)] transition-colors ${
                loc === locale ? "bg-[var(--surface-overlay)]" : ""
              }`}
            >
              <span className="text-lg">{localeFlags[loc]}</span>
              <span className="text-white">{localeNames[loc]}</span>
              {loc === locale && (
                <span className="material-symbols-outlined text-[var(--color-primary)] ml-auto">
                  check
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
