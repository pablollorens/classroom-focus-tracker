"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export function SignOutButton() {
  const t = useTranslations("auth");

  const handleSignOut = () => {
    // Clear remember session preference
    localStorage.removeItem("rememberSession");
    signOut({ callbackUrl: "/" });
  };

  return (
    <button
      onClick={handleSignOut}
      className="btn-ghost btn-sm"
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      <span className="hidden sm:inline">{t("signOut")}</span>
    </button>
  );
}
