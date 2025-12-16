"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { EmptyState } from "@/components/common";

interface ScheduledClass {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  duration: number;
  isRecurring: boolean;
  notes: string | null;
  group: { id: string; name: string };
  preparedLesson: { id: string; title: string };
}

interface PreparedLesson {
  id: string;
  title: string;
}

interface Group {
  id: string;
  name: string;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00

const CLASS_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-amber-600",
  "bg-red-600",
  "bg-cyan-600",
];

export default function CalendarPage() {
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    return new Date(now.setDate(diff));
  });
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [lessons, setLessons] = useState<PreparedLesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    hour: number;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    groupId: "",
    preparedLessonId: "",
    duration: 60,
    isRecurring: false,
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const [classesRes, lessonsRes, groupsRes] = await Promise.all([
        fetch(
          `/api/scheduled-classes?weekStart=${currentWeekStart.toISOString()}&weekEnd=${weekEnd.toISOString()}`
        ),
        fetch("/api/lessons"),
        fetch("/api/groups"),
      ]);

      if (classesRes.ok) {
        const data = await classesRes.json();
        setScheduledClasses(data);
      }
      if (lessonsRes.ok) {
        const data = await lessonsRes.json();
        setLessons(data);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [currentWeekStart]);

  const today = new Date();
  const currentHour = today.getHours();
  const currentMinutes = today.getMinutes();

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentWeekStart(newDate);
  };

  const handleCellClick = (dayIndex: number, hour: number) => {
    setSelectedSlot({ day: dayIndex + 1, hour }); // +1 porque weekDays empieza en lunes (1)
    setShowModal(true);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !formData.groupId || !formData.preparedLessonId) return;

    const specificDate = weekDays[selectedSlot.day - 1];
    specificDate.setHours(selectedSlot.hour, 0, 0, 0);

    try {
      const res = await fetch("/api/scheduled-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: formData.groupId,
          preparedLessonId: formData.preparedLessonId,
          dayOfWeek: formData.isRecurring ? selectedSlot.day : undefined,
          specificDate: !formData.isRecurring
            ? specificDate.toISOString()
            : undefined,
          startTime: `${selectedSlot.hour.toString().padStart(2, "0")}:00`,
          duration: formData.duration,
          isRecurring: formData.isRecurring,
          notes: formData.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          groupId: "",
          preparedLessonId: "",
          duration: 60,
          isRecurring: false,
          notes: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error creating class:", error);
    }
  };

  const startSession = async (classId: string) => {
    try {
      const res = await fetch(`/api/scheduled-classes/${classId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/sessions/${data.sessionId}`);
      }
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const getClassesForSlot = (dayIndex: number, hour: number) => {
    const dayOfWeek = dayIndex + 1; // Lunes = 1
    const dateStr = weekDays[dayIndex].toISOString().split("T")[0];

    return scheduledClasses.filter((sc) => {
      const startHour = parseInt(sc.startTime.split(":")[0]);
      const matchesTime = startHour === hour;

      if (sc.isRecurring) {
        return sc.dayOfWeek === dayOfWeek && matchesTime;
      } else if (sc.specificDate) {
        const classDate = new Date(sc.specificDate).toISOString().split("T")[0];
        return classDate === dateStr && matchesTime;
      }
      return false;
    });
  };

  const getColorForGroup = (groupId: string) => {
    const index = groups.findIndex((g) => g.id === groupId);
    return CLASS_COLORS[index % CLASS_COLORS.length];
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">Cargando calendario...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="!p-0 !max-w-none">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-default)] flex-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="btn-ghost btn-icon-sm"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h1 className="text-heading text-lg">
            {weekDays[0].toLocaleDateString("es-ES", {
              month: "long",
              day: "numeric",
            })}{" "}
            -{" "}
            {weekDays[4].toLocaleDateString("es-ES", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h1>
          <button
            onClick={() => navigateWeek(1)}
            className="btn-ghost btn-icon-sm"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <button
          onClick={() => setCurrentWeekStart(new Date())}
          className="btn-secondary btn-sm"
        >
          Hoy
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {/* Day Headers */}
          <div className="calendar-header">
            <div className="calendar-day-header" /> {/* Time column */}
            {weekDays.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  key={i}
                  className={
                    isToday
                      ? "calendar-day-header-current"
                      : "calendar-day-header"
                  }
                >
                  <p className="text-caption">{DAYS[date.getDay()]}</p>
                  <p
                    className={`text-heading text-lg ${
                      isToday ? "text-[var(--color-primary)]" : ""
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="calendar-grid">
            {HOURS.map((hour) => (
              <>
                <div key={`time-${hour}`} className="calendar-time-label">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                {weekDays.map((date, dayIndex) => {
                  const isToday = date.toDateString() === today.toDateString();
                  const classes = getClassesForSlot(dayIndex, hour);

                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`calendar-cell ${
                        isToday ? "calendar-cell-current" : ""
                      } relative`}
                      onClick={() => handleCellClick(dayIndex, hour)}
                    >
                      {/* Current time indicator */}
                      {isToday && hour === currentHour && (
                        <div
                          className="calendar-time-indicator"
                          style={{ top: `${(currentMinutes / 60) * 100}%` }}
                        >
                          <div className="calendar-time-indicator-dot" />
                        </div>
                      )}

                      {/* Scheduled classes */}
                      {classes.map((sc) => (
                        <div
                          key={sc.id}
                          className={`calendar-class-card ${getColorForGroup(
                            sc.group.id
                          )}`}
                          style={{
                            height: `${(sc.duration / 60) * 80 - 8}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            startSession(sc.id);
                          }}
                        >
                          <span className="text-white text-xs font-bold truncate">
                            {sc.group.name}
                          </span>
                          <span className="text-white/80 text-xs truncate">
                            {sc.preparedLesson.title}
                          </span>
                          <span className="text-white/60 text-[10px]">
                            {sc.startTime} - {sc.duration}min
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {/* Lesson Bank Sidebar */}
        <div className="w-72 border-l border-[var(--border-default)] bg-[var(--surface-darker)] p-4 overflow-y-auto custom-scrollbar hidden lg:block">
          <h2 className="text-heading text-sm mb-4">Banco de Lecciones</h2>
          {lessons.length === 0 ? (
            <p className="text-caption text-center py-8">
              No hay lecciones creadas
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="lesson-bank-item">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-lg mb-1">
                    menu_book
                  </span>
                  <p className="text-sm text-white font-medium truncate">
                    {lesson.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex-center z-50">
          <div className="surface-card w-full max-w-md p-6 m-4">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-lg">Programar Clase</h2>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost btn-icon-sm"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Grupo</label>
                <select
                  value={formData.groupId}
                  onChange={(e) =>
                    setFormData({ ...formData, groupId: e.target.value })
                  }
                  className="form-select"
                  required
                >
                  <option value="">Seleccionar grupo...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lección</label>
                <select
                  value={formData.preparedLessonId}
                  onChange={(e) =>
                    setFormData({ ...formData, preparedLessonId: e.target.value })
                  }
                  className="form-select"
                  required
                >
                  <option value="">Seleccionar lección...</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duración (minutos)</label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: parseInt(e.target.value) })
                  }
                  className="form-select"
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData({ ...formData, isRecurring: e.target.checked })
                  }
                  className="form-checkbox"
                />
                <label htmlFor="recurring" className="text-body text-sm">
                  Repetir semanalmente
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Notas (opcional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="form-textarea"
                  rows={2}
                  placeholder="Notas para esta clase..."
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary btn-md flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary btn-md flex-1">
                  Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
