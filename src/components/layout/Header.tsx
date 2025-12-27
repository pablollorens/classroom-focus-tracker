"use client";

import Image from "next/image";
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
        <div className="md:hidden">
          <Image
            src="/logo.png"
            alt="Kibo Class"
            width={100}
            height={40}
            className="object-contain"
            priority
          />
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
