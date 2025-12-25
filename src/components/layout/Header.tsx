"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSelector } from "@/components/LanguageSelector";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        {/* Mobile Logo */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex-center size-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-blue-600 text-white">
            <span className="material-symbols-outlined text-lg">
              center_focus_strong
            </span>
          </div>
          <span className="text-white font-bold text-sm">CFT</span>
        </div>

        {/* Title (desktop) */}
        {title && (
          <div className="hidden md:block">
            <h2 className="text-white text-lg font-bold">{title}</h2>
            {subtitle && (
              <p className="text-[var(--text-secondary)] text-xs">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <LanguageSelector />

        {/* User info */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-white text-sm font-medium">
              {session?.user?.email}
            </span>
          </div>
          <div className="size-9 rounded-full bg-[var(--surface-overlay)] flex-center text-[var(--text-secondary)]">
            <span className="material-symbols-outlined">person</span>
          </div>
        </div>

        <SignOutButton />
      </div>
    </header>
  );
}
