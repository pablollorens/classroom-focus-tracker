"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn-ghost btn-sm"
    >
      <span className="material-symbols-outlined text-lg">logout</span>
      <span className="hidden sm:inline">Salir</span>
    </button>
  );
}
