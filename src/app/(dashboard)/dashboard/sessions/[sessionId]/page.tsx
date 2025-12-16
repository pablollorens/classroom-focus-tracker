"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DistractionTimer } from "@/components/DistractionTimer";
import { Toast } from "@/components/Toast";
import { Avatar, StatusDot } from "@/components/common";
import { supabase } from "@/lib/supabase";

interface SessionDetails {
  id: string;
  isActive: boolean;
  password: string;
  createdAt: string;
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
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Periodic re-render every second for countdown timer
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyPassword = () => {
    if (session) {
      navigator.clipboard.writeText(session.password);
      setToastMessage("Código copiado");
      setShowToast(true);
    }
  };

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
    if (!confirm("¿Seguro que deseas terminar esta sesión?")) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      setToastMessage("Error al terminar sesión");
      setShowToast(true);
    }
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

  // Stats calculation
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
  }, [attendance]);

  // Session timer
  const sessionDuration = useMemo(() => {
    if (!session) return "00:00";
    const start = new Date(session.createdAt).getTime();
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
  }, [session]);

  // Filter attendance
  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const effectiveStatus = getEffectiveStatus(
        record.currentStatus,
        record.lastHeartbeat
      );
      const matchesFilter =
        statusFilter === "ALL" || effectiveStatus === statusFilter;
      const matchesSearch =
        record.student.firstName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        record.student.lastName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        record.student.username
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [attendance, statusFilter, searchQuery]);

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
  }, [filteredAttendance]);

  if (loading) {
    return (
      <div className="flex-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-body">Cargando sesión...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-center h-screen flex-col gap-4">
        <span className="material-symbols-outlined text-6xl text-[var(--text-muted)]">
          error
        </span>
        <h2 className="text-heading text-xl">Sesión no encontrada</h2>
        <Link href="/dashboard" className="btn-primary btn-md">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-[var(--surface-darker)] border-r border-[var(--border-default)]">
        {/* Logo */}
        <div className="p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-blue-600 flex-center shadow-lg">
              <span className="material-symbols-outlined text-white text-xl">
                sensors
              </span>
            </div>
            <div>
              <h1 className="text-heading text-sm">Sesión en Vivo</h1>
              <p className="text-caption">{session.group.name}</p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="p-4 border-b border-[var(--border-default)]">
          <p className="text-label mb-2">Duración</p>
          <div className="text-4xl font-bold font-mono text-[var(--text-primary)]">
            {sessionDuration}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3 flex-1">
          <p className="text-label">Estadísticas</p>

          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
              statusFilter === "ACTIVE"
                ? "bg-green-500/20 border border-green-500/30"
                : "hover:bg-[var(--surface-hover)]"
            }`}
          >
            <StatusDot status="active" />
            <span className="flex-1 text-left text-sm">Activos</span>
            <span className="text-xl font-bold text-green-400">
              {stats.active}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("DISTRACTED")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
              statusFilter === "DISTRACTED"
                ? "bg-red-500/20 border border-red-500/30"
                : "hover:bg-[var(--surface-hover)]"
            }`}
          >
            <StatusDot status="distracted" />
            <span className="flex-1 text-left text-sm">Distraídos</span>
            <span className="text-xl font-bold text-red-400">
              {stats.distracted}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("IDLE")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
              statusFilter === "IDLE"
                ? "bg-yellow-500/20 border border-yellow-500/30"
                : "hover:bg-[var(--surface-hover)]"
            }`}
          >
            <StatusDot status="idle" />
            <span className="flex-1 text-left text-sm">Inactivos</span>
            <span className="text-xl font-bold text-yellow-400">
              {stats.idle}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("OFFLINE")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
              statusFilter === "OFFLINE"
                ? "bg-gray-500/20 border border-gray-500/30"
                : "hover:bg-[var(--surface-hover)]"
            }`}
          >
            <StatusDot status="offline" />
            <span className="flex-1 text-left text-sm">Desconectados</span>
            <span className="text-xl font-bold text-gray-400">
              {stats.offline}
            </span>
          </button>

          {statusFilter !== "ALL" && (
            <button
              onClick={() => setStatusFilter("ALL")}
              className="w-full p-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              Ver todos
            </button>
          )}
        </div>

        {/* End Session */}
        <div className="p-4 border-t border-[var(--border-default)]">
          <button onClick={handleEndSession} className="btn-danger w-full">
            <span className="material-symbols-outlined text-lg">stop</span>
            Terminar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-default)] bg-[var(--surface-base)]">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-hover)]"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-heading text-lg">
                {session.preparedLesson.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-caption lg:hidden">
                  {session.group.name}
                </span>
                <span className="text-label lg:hidden">•</span>
                <span className="lg:hidden text-caption font-mono">
                  {sessionDuration}
                </span>
              </div>
            </div>
          </div>

          {/* Session Code */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-caption">Código de acceso</p>
              <button
                onClick={handleCopyPassword}
                className="text-2xl font-bold font-mono text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1"
              >
                {session.password}
                <span className="material-symbols-outlined text-lg">
                  content_copy
                </span>
              </button>
            </div>
            <button
              onClick={handleEndSession}
              className="btn-danger btn-sm lg:hidden"
            >
              <span className="material-symbols-outlined text-lg">stop</span>
            </button>
          </div>
        </header>

        {/* Mobile Stats Bar */}
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-[var(--border-default)] bg-[var(--surface-darker)] overflow-x-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
            }`}
          >
            Todos ({attendance.length})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
              statusFilter === "ACTIVE"
                ? "bg-green-500 text-white"
                : "bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
            }`}
          >
            <StatusDot status="active" />
            {stats.active}
          </button>
          <button
            onClick={() => setStatusFilter("DISTRACTED")}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
              statusFilter === "DISTRACTED"
                ? "bg-red-500 text-white"
                : "bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
            }`}
          >
            <StatusDot status="distracted" />
            {stats.distracted}
          </button>
          <button
            onClick={() => setStatusFilter("IDLE")}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
              statusFilter === "IDLE"
                ? "bg-yellow-500 text-white"
                : "bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
            }`}
          >
            <StatusDot status="idle" />
            {stats.idle}
          </button>
          <button
            onClick={() => setStatusFilter("OFFLINE")}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
              statusFilter === "OFFLINE"
                ? "bg-gray-500 text-white"
                : "bg-[var(--surface-overlay)] text-[var(--text-secondary)]"
            }`}
          >
            <StatusDot status="offline" />
            {stats.offline}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--border-default)]">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar estudiantes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
        </div>

        {/* Students Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedAttendance.length === 0 ? (
            <div className="flex-center h-full flex-col gap-4">
              <span className="material-symbols-outlined text-6xl text-[var(--text-muted)]">
                {attendance.length === 0 ? "group_off" : "search_off"}
              </span>
              <div className="text-center">
                <h3 className="text-heading text-lg mb-1">
                  {attendance.length === 0
                    ? "Esperando estudiantes"
                    : "Sin resultados"}
                </h3>
                <p className="text-body">
                  {attendance.length === 0 ? (
                    <>
                      Los estudiantes deben ingresar el código{" "}
                      <span className="font-mono font-bold text-[var(--color-primary)]">
                        {session.password}
                      </span>
                    </>
                  ) : (
                    "No se encontraron estudiantes con esos filtros"
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
                    className={`rounded-xl border-2 p-4 transition-all ${cardStyles[effectiveStatus]}`}
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
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">
                          {record.student.firstName} {record.student.lastName}
                        </h3>
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
                            ? "Activo"
                            : effectiveStatus === "DISTRACTED"
                            ? "Distraído"
                            : effectiveStatus === "IDLE"
                            ? "Inactivo"
                            : "Desconectado"}
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
        </div>
      </main>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
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
    </div>
  );
}
