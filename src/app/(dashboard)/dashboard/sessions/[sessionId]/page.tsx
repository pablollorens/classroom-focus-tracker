"use client";

import { useState, useEffect, use, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { DistractionTimer } from "@/components/DistractionTimer";
import { Toast } from "@/components/Toast";
import { Avatar, StatusDot, ConfirmModal } from "@/components/common";
import { supabase } from "@/lib/supabase";

interface SessionDetails {
  id: string;
  isActive: boolean;
  password: string;
  startedAt: string;
  preparedLesson: {
    title: string;
  };
  group: {
    name: string;
  };
}

interface AttendanceRecord {
  id: string;
  currentStatus: string;
  lastHeartbeat: string;
  lastStatusChange: string;
  handRaised: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

type StatusFilter = "ALL" | "ACTIVE" | "DISTRACTED" | "IDLE" | "OFFLINE";

export default function TeacherSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const t = useTranslations("session");
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tick, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);

  // Periodic re-render every second for countdown timer
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyPassword = () => {
    if (session) {
      navigator.clipboard.writeText(session.password);
      setToastMessage(t("codeCopied"));
      setShowToast(true);
    }
  };

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error(err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Realtime subscription for Attendance
  useEffect(() => {
    if (!session) return;

    const fetchAttendance = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setAttendance(data);
        }
      } catch (err) {
        console.error("Fetch error", err);
      }
    };

    fetchAttendance();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "SessionAttendance",
          filter: `sessionId=eq.${sessionId}`,
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, session]);

  const handleEndSession = async () => {
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      setToastMessage(t("errorEndingSession"));
      setShowToast(true);
    }
    setShowEndSessionModal(false);
  };

  // Status calculations
  const getEffectiveStatus = (
    status: string,
    lastHeartbeat: string
  ): StatusFilter => {
    const lastActive = new Date(lastHeartbeat).getTime();
    const now = new Date().getTime();
    const diff = (now - lastActive) / 1000;

    if (diff > 60) return "OFFLINE";
    if (status === "DISTRACTED") return "DISTRACTED";
    if (status === "IDLE") return "IDLE";
    return "ACTIVE";
  };

  const getHeartbeatCountdown = (lastHeartbeat: string) => {
    const lastActive = new Date(lastHeartbeat).getTime();
    const now = new Date().getTime();
    const diff = (now - lastActive) / 1000;
    const remaining = Math.max(0, 60 - diff);
    return Math.floor(remaining);
  };

  // Stats calculation - tick dependency ensures recalculation every second for OFFLINE detection
  const stats = useMemo(() => {
    const result = { active: 0, distracted: 0, idle: 0, offline: 0 };
    attendance.forEach((record) => {
      const status = getEffectiveStatus(
        record.currentStatus,
        record.lastHeartbeat
      );
      if (status === "ACTIVE") result.active++;
      else if (status === "DISTRACTED") result.distracted++;
      else if (status === "IDLE") result.idle++;
      else result.offline++;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance, tick]);

  // Session timer - calculated every render (triggered by tick interval)
  const sessionDuration = (() => {
    if (!session?.startedAt) return "00:00";
    const start = new Date(session.startedAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  })();

  // Filter attendance
  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const effectiveStatus = getEffectiveStatus(
        record.currentStatus,
        record.lastHeartbeat
      );
      return statusFilter === "ALL" || effectiveStatus === statusFilter;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance, statusFilter, tick]);

  // Sort by status priority: distracted first, then idle, then active, then offline
  const sortedAttendance = useMemo(() => {
    const statusPriority: Record<StatusFilter, number> = {
      DISTRACTED: 0,
      IDLE: 1,
      ACTIVE: 2,
      OFFLINE: 3,
      ALL: 4,
    };
    return [...filteredAttendance].sort((a, b) => {
      const statusA = getEffectiveStatus(a.currentStatus, a.lastHeartbeat);
      const statusB = getEffectiveStatus(b.currentStatus, b.lastHeartbeat);
      return statusPriority[statusA] - statusPriority[statusB];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAttendance, tick]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">{t("loading")}</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!session) {
    return (
      <PageContainer>
        <div className="flex-center h-64 flex-col gap-4">
          <span className="material-symbols-outlined text-6xl text-[var(--text-muted)]">
            error
          </span>
          <h2 className="text-heading text-xl">{t("notFound")}</h2>
          <Link href="/dashboard" className="btn-primary btn-md">
            {t("backToDashboard")}
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {t("live")}
            </span>
            <span className="text-caption">•</span>
            <span className="text-caption">{session.group?.name}</span>
          </div>
          <h1 className="text-heading-xl">
            {session.preparedLesson?.title || t("liveSession")}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-caption text-xs">{t("accessCode")}</p>
            <button
              onClick={handleCopyPassword}
              className="text-2xl font-bold font-mono text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 cursor-pointer"
            >
              {session.password}
              <span className="material-symbols-outlined text-lg">
                content_copy
              </span>
            </button>
          </div>
          <button onClick={() => setShowEndSessionModal(true)} className="btn-danger btn-md cursor-pointer">
            <span className="material-symbols-outlined text-lg">stop_circle</span>
            <span className="hidden sm:inline">{t("end")}</span>
          </button>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Duration */}
        <div className="surface-card p-4 flex items-center gap-3">
          <div className="icon-container-md icon-primary">
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {sessionDuration}
            </p>
            <p className="text-caption text-xs">{t("duration")}</p>
          </div>
        </div>

        {/* Active */}
        <button
          onClick={() => setStatusFilter(statusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
          className={`surface-card p-4 flex items-center gap-3 transition-all ${
            statusFilter === "ACTIVE"
              ? "ring-2 ring-green-500 bg-green-500/10"
              : "hover:bg-[var(--surface-hover)]"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex-center">
            <StatusDot status="active" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            <p className="text-caption text-xs">{t("activePlural")}</p>
          </div>
        </button>

        {/* Distracted */}
        <button
          onClick={() => setStatusFilter(statusFilter === "DISTRACTED" ? "ALL" : "DISTRACTED")}
          className={`surface-card p-4 flex items-center gap-3 transition-all ${
            statusFilter === "DISTRACTED"
              ? "ring-2 ring-red-500 bg-red-500/10"
              : "hover:bg-[var(--surface-hover)]"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex-center">
            <StatusDot status="distracted" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-red-400">{stats.distracted}</p>
            <p className="text-caption text-xs">{t("distractedPlural")}</p>
          </div>
        </button>

        {/* Idle */}
        <button
          onClick={() => setStatusFilter(statusFilter === "IDLE" ? "ALL" : "IDLE")}
          className={`surface-card p-4 flex items-center gap-3 transition-all ${
            statusFilter === "IDLE"
              ? "ring-2 ring-yellow-500 bg-yellow-500/10"
              : "hover:bg-[var(--surface-hover)]"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex-center">
            <StatusDot status="idle" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-yellow-400">{stats.idle}</p>
            <p className="text-caption text-xs">{t("idlePlural")}</p>
          </div>
        </button>

        {/* Offline */}
        <button
          onClick={() => setStatusFilter(statusFilter === "OFFLINE" ? "ALL" : "OFFLINE")}
          className={`surface-card p-4 flex items-center gap-3 transition-all ${
            statusFilter === "OFFLINE"
              ? "ring-2 ring-gray-500 bg-gray-500/10"
              : "hover:bg-[var(--surface-hover)]"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gray-500/20 flex-center">
            <StatusDot status="offline" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-400">{stats.offline}</p>
            <p className="text-caption text-xs">{t("offlinePlural")}</p>
          </div>
        </button>
      </section>

      {/* Filter indicator */}
      {statusFilter !== "ALL" && (
        <div className="flex items-center gap-2">
          <span className="text-body text-sm">
            {t("filteringBy")} <span className="font-semibold">{statusFilter === "ACTIVE" ? t("activePlural") : statusFilter === "DISTRACTED" ? t("distractedPlural") : statusFilter === "IDLE" ? t("idlePlural") : t("offlinePlural")}</span>
          </span>
          <button
            onClick={() => setStatusFilter("ALL")}
            className="text-[var(--color-primary)] text-sm hover:underline"
          >
            {t("viewAll")}
          </button>
        </div>
      )}

      {/* Students Grid */}
      <section>
        {sortedAttendance.length === 0 ? (
          <div className="surface-card p-12 flex-center flex-col gap-4">
            <span className="material-symbols-outlined text-6xl text-[var(--text-muted)]">
              {attendance.length === 0 ? "group_off" : "search_off"}
            </span>
            <div className="text-center">
              <h3 className="text-heading text-lg mb-1">
                {attendance.length === 0
                  ? t("waitingForStudents")
                  : t("noResults")}
              </h3>
              <p className="text-body">
                {attendance.length === 0 ? (
                  <>
                    {t("studentsEnterCode")}{" "}
                    <span className="font-mono font-bold text-[var(--color-primary)]">
                      {session.password}
                    </span>
                  </>
                ) : (
                  t("noStudentsWithFilter")
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedAttendance.map((record) => {
              const effectiveStatus = getEffectiveStatus(
                record.currentStatus,
                record.lastHeartbeat
              );
              const countdown = getHeartbeatCountdown(record.lastHeartbeat);

              // Card style based on status
              const cardStyles: Record<StatusFilter, string> = {
                ACTIVE:
                  "border-green-500/30 bg-green-500/5 hover:border-green-500/50",
                DISTRACTED:
                  "border-red-500/50 bg-red-500/10 animate-pulse-subtle shadow-[0_0_15px_rgba(239,68,68,0.2)]",
                IDLE: "border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50",
                OFFLINE:
                  "border-[var(--border-default)] opacity-60 hover:opacity-80",
                ALL: "",
              };

              return (
                <div
                  key={record.id}
                  className={`rounded-xl border-2 p-4 transition-all ${cardStyles[effectiveStatus]} ${record.handRaised ? "animate-bounce ring-2 ring-yellow-400" : ""}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar
                        name={`${record.student.firstName} ${record.student.lastName}`}
                        size="lg"
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[var(--surface-base)] ${
                          effectiveStatus === "ACTIVE"
                            ? "bg-green-500"
                            : effectiveStatus === "DISTRACTED"
                            ? "bg-red-500 animate-pulse"
                            : effectiveStatus === "IDLE"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                        }`}
                      />
                    </div>

                    {/* Name & Username */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">
                          {record.student.firstName} {record.student.lastName}
                        </h3>
                        {record.handRaised && (
                          <span className="material-symbols-outlined text-yellow-400 text-lg">
                            front_hand
                          </span>
                        )}
                      </div>
                      <p className="text-caption">@{record.student.username}</p>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase ${
                          effectiveStatus === "ACTIVE"
                            ? "text-green-400"
                            : effectiveStatus === "DISTRACTED"
                            ? "text-red-400"
                            : effectiveStatus === "IDLE"
                            ? "text-yellow-400"
                            : "text-gray-400"
                        }`}
                      >
                        {effectiveStatus === "ACTIVE"
                          ? t("active")
                          : effectiveStatus === "DISTRACTED"
                          ? t("distracted")
                          : effectiveStatus === "IDLE"
                          ? t("idle")
                          : t("offline")}
                      </span>
                      {(record.currentStatus === "DISTRACTED" ||
                        record.currentStatus === "IDLE") &&
                        effectiveStatus !== "OFFLINE" && (
                          <DistractionTimer
                            startTime={record.lastStatusChange}
                            status={record.currentStatus}
                          />
                        )}
                    </div>

                    {/* Countdown */}
                    {effectiveStatus !== "OFFLINE" && (
                      <span
                        className={`text-xs font-mono ${
                          countdown <= 10
                            ? "text-red-400 font-bold"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {countdown}s
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={handleCloseToast}
      />

      {/* End Session Confirmation Modal */}
      <ConfirmModal
        isOpen={showEndSessionModal}
        onClose={() => setShowEndSessionModal(false)}
        onConfirm={handleEndSession}
        title={t("endSessionTitle")}
        message={t("endSessionMessage")}
        confirmText={t("endSessionConfirm")}
        variant="warning"
      />

      <style jsx>{`
        @keyframes pulse-subtle {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </PageContainer>
  );
}
