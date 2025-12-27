"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(t("invalidToken"));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error === "Invalid or expired token" ? t("invalidToken") :
                 data.error === "Token has expired" ? t("tokenExpired") :
                 t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] font-[Manrope] text-slate-900 dark:text-white antialiased min-h-screen flex flex-col overflow-x-hidden">
      {/* Language Selector */}
      <div className="absolute top-4 right-6 lg:right-10 z-20">
        <LanguageSelector />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Kibo Class"
                width={200}
                height={80}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-[#1c252e] rounded-2xl shadow-xl dark:shadow-none border border-slate-200 dark:border-[#2c3642] p-8">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500 text-3xl">
                    check_circle
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t("successTitle")}
                </h1>
                <p className="text-slate-500 dark:text-[#9dabb9] mb-6">
                  {t("successDescription")}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-full rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-base font-bold transition-colors shadow-lg shadow-blue-500/20"
                >
                  {t("goToLogin")}
                  <span className="material-symbols-outlined ml-2 text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            ) : !token ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-3xl">
                    error
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t("invalidTokenTitle")}
                </h1>
                <p className="text-slate-500 dark:text-[#9dabb9] mb-6">
                  {t("invalidTokenDescription")}
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center w-full rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-base font-bold transition-colors shadow-lg shadow-blue-500/20"
                >
                  {t("requestNewLink")}
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t("title")}
                </h1>
                <p className="text-slate-500 dark:text-[#9dabb9] mb-6">
                  {t("description")}
                </p>

                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">error</span>
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      htmlFor="password"
                    >
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">
                          lock
                        </span>
                      </div>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-lg border-slate-200 dark:border-[#36414e] bg-slate-50 dark:bg-[#111418] text-slate-900 dark:text-white pl-10 pr-4 py-3 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] placeholder:text-slate-400 dark:placeholder:text-[#5f6e7c] outline-none transition-all"
                        placeholder="••••••••"
                        required
                        autoFocus
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                      htmlFor="confirmPassword"
                    >
                      {t("confirmLabel")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[20px]">
                          lock
                        </span>
                      </div>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full rounded-lg border-slate-200 dark:border-[#36414e] bg-slate-50 dark:bg-[#111418] text-slate-900 dark:text-white pl-10 pr-4 py-3 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] placeholder:text-slate-400 dark:placeholder:text-[#5f6e7c] outline-none transition-all"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-base font-bold transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        {t("saving")}
                      </>
                    ) : (
                      <>
                        {t("submit")}
                        <span className="material-symbols-outlined ml-2 text-sm">
                          check
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
