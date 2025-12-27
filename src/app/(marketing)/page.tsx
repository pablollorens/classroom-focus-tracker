"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/LanguageSelector";

type Role = "student" | "teacher";

export default function Home() {
  const t = useTranslations("landing");
  const router = useRouter();
  const { data: session, status } = useSession();
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Teacher form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Auto-redirect if remembered session exists
  useEffect(() => {
    if (status === "loading") return;

    const remembered = localStorage.getItem("rememberSession") === "true";
    if (session && remembered) {
      window.location.href = "/dashboard";
    } else {
      setCheckingSession(false);
    }
  }, [session, status]);

  // Student form
  const [username, setUsername] = useState("");
  const [sessionCode, setSessionCode] = useState("");

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("invalidCredentials"));
      setLoading(false);
    } else {
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberSession", "true");
      } else {
        localStorage.removeItem("rememberSession");
      }
      // Full page navigation to ensure server sees fresh session
      window.location.href = "/dashboard";
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: sessionCode }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store student session info
        localStorage.setItem("studentSession", JSON.stringify(data));
        router.push("/class/session");
      } else {
        setError(data.error || t("errorJoiningSession"));
      }
    } catch {
      setError(t("connectionError"));
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101922]">
        <div className="size-8 border-2 border-white/30 border-t-[#137fec] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#101922] font-[Manrope] text-slate-900 dark:text-white antialiased min-h-screen flex flex-col overflow-x-hidden">
      {/* Language Selector - floating top right */}
      <div className="absolute top-4 right-6 lg:right-10 z-20">
        <LanguageSelector />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start pt-16 lg:pt-24 p-4 relative w-full">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-[#137fec]/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[0%] left-[0%] w-[400px] h-[400px] bg-[#137fec]/5 rounded-full blur-[80px]"></div>
        </div>

        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 lg:gap-16 items-start justify-center z-10">
          {/* Left Column: Hero Text */}
          <div className="flex-1 max-w-[480px] flex flex-col gap-6 text-center lg:text-left">
            {/* Logo */}
            <div className="flex justify-center lg:justify-center mb-2">
              <Image
                src="/logo.png"
                alt="Kibo Class"
                width={320}
                height={128}
                className="object-contain"
                priority
              />
            </div>

            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#137fec]/10 border border-[#137fec]/20 text-[#137fec] text-xs font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#137fec] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#137fec]"></span>
                </span>
                {t("realtimeMonitoring")}
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                {t("heroTitle")}{" "}
                <span className="text-[#137fec]">{t("heroTitleHighlight")}</span>{t("heroTitleEnd")}
              </h1>
              <p className="text-slate-500 dark:text-[#9dabb9] text-lg leading-relaxed">
                {t("heroDescription")}
              </p>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="flex-1 w-full max-w-[460px] lg:mt-44">
            <div className="bg-white dark:bg-[#1c252e] rounded-2xl shadow-xl dark:shadow-none border border-slate-200 dark:border-[#2c3642] overflow-hidden">
              <div className="p-8 pb-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {t("welcomeBack")}
                </h2>
                <p className="text-slate-500 dark:text-[#9dabb9]">
                  {t("selectProfile")}
                </p>
              </div>

              {/* Role Selection */}
              <div className="px-8 flex gap-4 mb-6">
                <label className="cursor-pointer flex-1 group">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === "student"}
                    onChange={() => {
                      setRole("student");
                      setError("");
                    }}
                    className="peer sr-only"
                  />
                  <div className="role-card-transition h-full flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-100 dark:border-[#2c3642] bg-slate-50 dark:bg-[#151c24] peer-checked:border-[#137fec] peer-checked:bg-[#137fec]/5 dark:peer-checked:bg-[#137fec]/10 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#137fec]/20">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#283039] text-slate-500 dark:text-slate-400 group-hover:bg-[#137fec]/20 group-hover:text-[#137fec] peer-checked:bg-[#137fec] peer-checked:text-white flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <span className="font-bold text-sm text-slate-600 dark:text-slate-300 peer-checked:text-[#137fec]">
                      {t("student")}
                    </span>
                  </div>
                </label>
                <label className="cursor-pointer flex-1 group">
                  <input
                    type="radio"
                    name="role"
                    value="teacher"
                    checked={role === "teacher"}
                    onChange={() => {
                      setRole("teacher");
                      setError("");
                    }}
                    className="peer sr-only"
                  />
                  <div className="role-card-transition h-full flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-100 dark:border-[#2c3642] bg-slate-50 dark:bg-[#151c24] peer-checked:border-[#137fec] peer-checked:bg-[#137fec]/5 dark:peer-checked:bg-[#137fec]/10 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#137fec]/20">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#283039] text-slate-500 dark:text-slate-400 group-hover:bg-[#137fec]/20 group-hover:text-[#137fec] peer-checked:bg-[#137fec] peer-checked:text-white flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined">
                        cast_for_education
                      </span>
                    </div>
                    <span className="font-bold text-sm text-slate-600 dark:text-slate-300 peer-checked:text-[#137fec]">
                      {t("teacher")}
                    </span>
                  </div>
                </label>
              </div>

              {/* Error message */}
              {error && (
                <div className="mx-8 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                  </p>
                </div>
              )}

              {/* Login Form */}
              <form
                onSubmit={role === "teacher" ? handleTeacherLogin : handleStudentLogin}
                className="px-8 pb-8 flex flex-col gap-5"
              >
                {/* Teacher Fields */}
                {role === "teacher" && (
                  <>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="email"
                      >
                        {t("institutionalEmail")}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">
                            mail
                          </span>
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full rounded-lg border-slate-200 dark:border-[#36414e] bg-slate-50 dark:bg-[#111418] text-slate-900 dark:text-white pl-10 pr-4 py-3 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] placeholder:text-slate-400 dark:placeholder:text-[#5f6e7c] outline-none transition-all"
                          placeholder={t("emailPlaceholder")}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label
                          className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                          htmlFor="password"
                        >
                          {t("password")}
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-[#137fec] hover:text-blue-400"
                        >
                          {t("forgotPassword")}
                        </Link>
                      </div>
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
                        />
                      </div>
                    </div>
                    <div className="flex items-center pt-2">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-[#36414e] text-[#137fec] focus:ring-[#137fec] bg-slate-50 dark:bg-[#111418]"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-slate-600 dark:text-slate-400"
                      >
                        {t("rememberSession")}
                      </label>
                    </div>
                  </>
                )}

                {/* Student Fields */}
                {role === "student" && (
                  <>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="username"
                      >
                        {t("username")}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">
                            person
                          </span>
                        </div>
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="block w-full rounded-lg border-slate-200 dark:border-[#36414e] bg-slate-50 dark:bg-[#111418] text-slate-900 dark:text-white pl-10 pr-4 py-3 text-sm focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] placeholder:text-slate-400 dark:placeholder:text-[#5f6e7c] outline-none transition-all"
                          placeholder={t("usernamePlaceholder")}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label
                        className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        htmlFor="sessionCode"
                      >
                        {t("sessionCode")}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">
                            key
                          </span>
                        </div>
                        <input
                          id="sessionCode"
                          type="text"
                          value={sessionCode}
                          onChange={(e) => setSessionCode(e.target.value)}
                          maxLength={6}
                          className="block w-full rounded-lg border-slate-200 dark:border-[#36414e] bg-slate-50 dark:bg-[#111418] text-slate-900 dark:text-white pl-10 pr-4 py-3 text-sm font-mono tracking-widest focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] placeholder:text-slate-400 dark:placeholder:text-[#5f6e7c] outline-none transition-all"
                          placeholder={t("sessionCodePlaceholder")}
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t("askTeacherForCode")}
                      </p>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      <span className="truncate">{t("processing")}</span>
                    </>
                  ) : (
                    <>
                      <span className="truncate">
                        {role === "student" ? t("joinClass") : t("enterPortal")}
                      </span>
                      <span className="material-symbols-outlined ml-2 text-sm">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-10 text-center border-t border-slate-200 dark:border-[#283039] bg-white dark:bg-[#111418]">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-4">
          <p className="text-sm text-slate-500 dark:text-[#9dabb9]">
            &copy; {new Date().getFullYear()} Kibo Class. {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
}
