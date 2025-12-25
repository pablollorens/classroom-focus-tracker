"use client";

import { useState, useEffect, useMemo, Fragment, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { Toast } from "@/components/Toast";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  pointerWithin,
} from "@dnd-kit/core";

interface ScheduledClass {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  duration: number;
  isRecurring: boolean;
  notes: string | null;
  group: { id: string; name: string } | null;
  preparedLesson: { id: string; title: string } | null;
}

interface PreparedLesson {
  id: string;
  title: string;
  duration?: number;
}

interface Group {
  id: string;
  name: string;
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00
const CELL_HEIGHT = 80; // Height of each hour cell in pixels
const SNAP_MINUTES = 5;
const PIXELS_PER_MINUTE = CELL_HEIGHT / 60;

const CLASS_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-amber-600",
  "bg-red-600",
  "bg-cyan-600",
];

// Draggable Group Component
function DraggableGroupItem({ group, colorClass }: { group: Group; colorClass: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `group-${group.id}`,
    data: { type: "group", group },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`lesson-bank-item cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className={`w-3 h-3 rounded-full ${colorClass} mb-1`} />
      <p className="text-sm text-white font-medium truncate">{group.name}</p>
    </div>
  );
}

// Draggable Calendar Event Component
function DraggableCalendarEvent({
  sc,
  topOffset,
  colorClass,
  onEdit,
}: {
  sc: ScheduledClass;
  topOffset: number;
  colorClass: string;
  onEdit: (sc: ScheduledClass) => void;
}) {
  const t = useTranslations("calendar");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${sc.id}`,
    data: { type: "event", scheduledClass: sc },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`calendar-class-card ${colorClass} cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        top: `${topOffset}px`,
        height: `${(sc.duration / 60) * CELL_HEIGHT - 4}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(sc);
      }}
    >
      <span className="text-white text-xs font-bold truncate">
        {sc.group?.name || t("event.noGroup")}
      </span>
      <span className="text-white/80 text-xs truncate">
        {sc.preparedLesson?.title || t("event.noLesson")}
      </span>
      <span className="text-white/60 text-[10px]">
        {sc.startTime} - {t("event.minutes", { duration: sc.duration })}
      </span>
    </div>
  );
}

// Droppable Calendar Cell Component
function DroppableCalendarCell({
  dayIndex,
  hour,
  isToday,
  currentHour,
  currentMinutes,
  classes,
  getColorForGroup,
  onEditClass,
  onCellClick,
  dropPreview,
  activeGroup,
  draggingEvent,
}: {
  dayIndex: number;
  hour: number;
  isToday: boolean;
  currentHour: number;
  currentMinutes: number;
  classes: ScheduledClass[];
  getColorForGroup: (groupId: string | null) => string;
  onEditClass: (sc: ScheduledClass) => void;
  onCellClick: (dayIndex: number, hour: number, minutes: number) => void;
  dropPreview: { dayIndex: number; hour: number; minutes: number } | null;
  activeGroup: Group | null;
  draggingEvent: ScheduledClass | null;
}) {
  const cellRef = useRef<HTMLDivElement>(null);
  const { setNodeRef } = useDroppable({
    id: `cell-${dayIndex}-${hour}`,
    data: { type: "cell", dayIndex, hour },
  });

  const handleClick = (e: React.MouseEvent) => {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const minutesInCell = (relativeY / CELL_HEIGHT) * 60;
      const snappedMinutes = Math.round(minutesInCell / SNAP_MINUTES) * SNAP_MINUTES;
      onCellClick(dayIndex, hour, Math.min(55, Math.max(0, snappedMinutes)));
    }
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (cellRef as any).current = node;
      }}
      data-cell-id={`cell-${dayIndex}-${hour}`}
      className={`calendar-cell ${isToday ? "calendar-cell-current" : ""} relative`}
      onClick={handleClick}
    >
      {/* 15-minute grid lines (subtle) */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-dashed border-[var(--border-default)]/30 pointer-events-none"
          style={{ top: `${(i * 15 / 60) * 100}%` }}
        />
      ))}

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
      {classes.map((sc) => {
        const [startHour, startMin] = sc.startTime.split(":").map(Number);
        const offsetMinutes = startHour === hour ? startMin : 0;
        const topOffset = (offsetMinutes / 60) * CELL_HEIGHT;

        return (
          <DraggableCalendarEvent
            key={sc.id}
            sc={sc}
            topOffset={topOffset}
            colorClass={getColorForGroup(sc.group?.id || null)}
            onEdit={onEditClass}
          />
        );
      })}

      {/* Drop Preview Ghost */}
      {dropPreview && dropPreview.dayIndex === dayIndex && dropPreview.hour === hour && (activeGroup || draggingEvent) && (
        <div
          className="absolute left-1 right-1 bg-[var(--color-primary)]/40 border-2 border-dashed border-[var(--color-primary)] rounded-lg pointer-events-none z-10 flex flex-col justify-center px-2 overflow-hidden"
          style={{
            top: `${(dropPreview.minutes / 60) * CELL_HEIGHT}px`,
            height: `${((draggingEvent?.duration || 60) / 60) * CELL_HEIGHT - 4}px`,
          }}
        >
          <span className="text-white text-xs font-bold truncate">
            {activeGroup?.name || draggingEvent?.group?.name}
          </span>
          <span className="text-white/70 text-[10px]">
            {hour.toString().padStart(2, "0")}:{dropPreview.minutes.toString().padStart(2, "0")} - {draggingEvent?.duration || 60}min
          </span>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const t = useTranslations("calendar");
  const router = useRouter();
  const calendarRef = useRef<HTMLDivElement>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [lessons, setLessons] = useState<PreparedLesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [draggingEvent, setDraggingEvent] = useState<ScheduledClass | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    dayIndex: number;
    hour: number;
    minutes: number;
  } | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    preparedLessonId: "",
    startTime: "",
    duration: 60,
    isRecurring: false,
    notes: "",
  });

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetchData(!initialLoadDone);
  }, [currentWeekStart]);

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Only fetch lessons and groups on initial load (they don't change per week)
      if (isInitial) {
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
      } else {
        // Only fetch classes for week changes
        const classesRes = await fetch(
          `/api/scheduled-classes?weekStart=${currentWeekStart.toISOString()}&weekEnd=${weekEnd.toISOString()}`
        );
        if (classesRes.ok) {
          const data = await classesRes.json();
          setScheduledClasses(data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (isInitial) {
        setLoading(false);
        setInitialLoadDone(true);
      }
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
    if (isAnimating) return;

    setSlideDirection(direction > 0 ? "left" : "right");
    setIsAnimating(true);

    // Small delay to let exit animation start, then update the week
    setTimeout(() => {
      const newDate = new Date(currentWeekStart);
      newDate.setDate(newDate.getDate() + direction * 7);
      setCurrentWeekStart(newDate);

      // Reset animation state after enter animation completes
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection(null);
      }, 200);
    }, 150);
  };

  const goToToday = () => {
    if (isAnimating) return;

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const todayWeekStart = new Date(now.setDate(diff));

    // Determine direction based on whether today is before or after current week
    const currentTime = currentWeekStart.getTime();
    const todayTime = todayWeekStart.getTime();

    if (currentTime === todayTime) return; // Already on current week

    setSlideDirection(todayTime > currentTime ? "left" : "right");
    setIsAnimating(true);

    setTimeout(() => {
      setCurrentWeekStart(todayWeekStart);
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection(null);
      }, 200);
    }, 150);
  };

  // Click on empty cell - do nothing for now (only drag to create)
  const handleCellClick = () => {
    // Empty cells are for dropping lessons only
  };

  // Click on existing scheduled class to edit
  const handleEditClass = (sc: ScheduledClass) => {
    setEditingClass(sc);
    setFormData({
      preparedLessonId: sc.preparedLesson?.id || "",
      startTime: sc.startTime,
      duration: sc.duration,
      isRecurring: sc.isRecurring,
      notes: sc.notes || "",
    });
    setShowModal(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "group") {
      setActiveGroupId(active.data.current.group.id);
      setDraggingEvent(null);
    } else if (active.data.current?.type === "event") {
      setDraggingEvent(active.data.current.scheduledClass);
      setActiveGroupId(null);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over, activatorEvent, delta } = event;

    if (!over || !activatorEvent || !('clientY' in activatorEvent)) {
      setDropPreview(null);
      return;
    }

    const cellData = over.data.current;
    if (cellData?.type !== "cell") {
      setDropPreview(null);
      return;
    }

    const { dayIndex, hour } = cellData;
    const e = activatorEvent as PointerEvent;
    const pointerY = e.clientY + (delta?.y || 0);

    // Get the cell element to calculate relative position
    const cellElement = document.querySelector(`[data-cell-id="cell-${dayIndex}-${hour}"]`);
    if (cellElement) {
      const rect = cellElement.getBoundingClientRect();
      const relativeY = pointerY - rect.top;
      const minutesInCell = (relativeY / CELL_HEIGHT) * 60;
      let minutes = Math.round(minutesInCell / SNAP_MINUTES) * SNAP_MINUTES;
      minutes = Math.min(55, Math.max(0, minutes));

      setDropPreview({ dayIndex, hour, minutes });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const preview = dropPreview;
    const movingEvent = draggingEvent;
    setActiveGroupId(null);
    setDraggingEvent(null);
    setDropPreview(null);

    if (!over) return;

    const cellData = over.data.current;
    if (cellData?.type !== "cell") return;

    // Use the preview position if available, otherwise default to top of cell
    const dayIndex = preview?.dayIndex ?? cellData.dayIndex;
    const hour = preview?.hour ?? cellData.hour;
    const minutes = preview?.minutes ?? 0;

    const specificDate = new Date(weekDays[dayIndex]);
    specificDate.setHours(hour, minutes, 0, 0);
    const startTime = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    // Moving an existing event
    if (movingEvent) {
      try {
        const res = await fetch(`/api/scheduled-classes/${movingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specificDate: specificDate.toISOString(),
            startTime,
            isRecurring: false,
          }),
        });

        if (res.ok) {
          const updatedClass = await res.json();
          setScheduledClasses((prev) =>
            prev.map((sc) => (sc.id === movingEvent.id ? updatedClass : sc))
          );
        }
      } catch (error) {
        console.error("Error moving class:", error);
      }
      return;
    }

    // Creating new from group
    const group = active.data.current?.group as Group | undefined;
    if (!group) return;

    try {
      const res = await fetch("/api/scheduled-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          specificDate: specificDate.toISOString(),
          startTime,
          duration: 60, // Default duration, can be changed in edit modal
          isRecurring: false,
        }),
      });

      if (res.ok) {
        const newClass = await res.json();
        setScheduledClasses((prev) => [...prev, newClass]);
      } else {
        const errorData = await res.json();
        console.error("API error:", res.status, errorData);
      }
    } catch (error) {
      console.error("Error creating class:", error);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    try {
      const res = await fetch(`/api/scheduled-classes/${editingClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preparedLessonId: formData.preparedLessonId || null,
          startTime: formData.startTime,
          duration: formData.duration,
          isRecurring: formData.isRecurring,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const updatedClass = await res.json();
        setScheduledClasses((prev) =>
          prev.map((sc) => (sc.id === editingClass.id ? updatedClass : sc))
        );
        setShowModal(false);
        setEditingClass(null);
      }
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  const handleDeleteClass = async () => {
    if (!editingClass) return;

    try {
      const res = await fetch(`/api/scheduled-classes/${editingClass.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setScheduledClasses((prev) => prev.filter((sc) => sc.id !== editingClass.id));
        setShowModal(false);
        setEditingClass(null);
      }
    } catch (error) {
      console.error("Error deleting class:", error);
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
      } else {
        const errorData = await res.json();
        setToastMessage(errorData.error || t("errors.startSessionError"));
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setToastMessage(t("errors.startSessionError"));
      setToastType("error");
      setShowToast(true);
    }
  };

  const getClassesForSlot = (dayIndex: number, hour: number) => {
    const dayOfWeek = dayIndex + 1;
    // Use local date format to avoid timezone issues with toISOString()
    const weekDay = weekDays[dayIndex];
    const dateStr = `${weekDay.getFullYear()}-${String(weekDay.getMonth() + 1).padStart(2, '0')}-${String(weekDay.getDate()).padStart(2, '0')}`;

    return scheduledClasses.filter((sc) => {
      const startHour = parseInt(sc.startTime.split(":")[0]);
      const matchesTime = startHour === hour;

      if (sc.isRecurring) {
        return sc.dayOfWeek === dayOfWeek && matchesTime;
      } else if (sc.specificDate) {
        // Parse and format using local date to match the weekDay format
        const classDate = new Date(sc.specificDate);
        const classDateStr = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}-${String(classDate.getDate()).padStart(2, '0')}`;
        return classDateStr === dateStr && matchesTime;
      }
      return false;
    });
  };

  const getColorForGroup = (groupId: string | null) => {
    if (!groupId) return "bg-gray-600"; // Default color for no group
    const index = groups.findIndex((g) => g.id === groupId);
    return CLASS_COLORS[index % CLASS_COLORS.length];
  };

  const activeGroup = activeGroupId
    ? groups.find((g) => g.id === activeGroupId) ?? null
    : null;

  // Require 8px movement before drag starts (allows click for edit)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <PageContainer>
        {/* Page Title */}
        <section>
          <h1 className="text-heading-xl mb-2">{t("title")}</h1>
          <p className="text-body">
            {t("subtitle")}
          </p>
        </section>

        {/* Calendar Card */}
        <div className="surface-card overflow-hidden">
          {/* Week Navigation */}
          <div className="p-4 border-b border-[var(--border-default)] flex-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek(-1)}
                className="btn-ghost btn-icon-sm"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <h2 className="text-heading text-lg">
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
              </h2>
              <button
                onClick={() => navigateWeek(1)}
                className="btn-ghost btn-icon-sm"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <button
              onClick={goToToday}
              className="btn-secondary btn-sm"
            >
              {t("today")}
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: "500px" }}>
            {/* Calendar Grid */}
            <div ref={calendarRef} className="flex-1 overflow-auto custom-scrollbar">
              <div
                className={`transition-all duration-200 ease-out ${
                  slideDirection === "left"
                    ? isAnimating
                      ? "-translate-x-4 opacity-0"
                      : "translate-x-0 opacity-100"
                    : slideDirection === "right"
                    ? isAnimating
                      ? "translate-x-4 opacity-0"
                      : "translate-x-0 opacity-100"
                    : ""
                }`}
              >
              {/* Day Headers */}
              <div className="calendar-header">
                <div className="calendar-day-header" />
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
                      <p className="text-caption">{t(`days.${DAY_KEYS[date.getDay()]}`)}</p>
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
                  <Fragment key={hour}>
                    <div className="calendar-time-label">
                      {hour.toString().padStart(2, "0")}:00
                    </div>
                    {weekDays.map((date, dayIndex) => {
                      const isToday = date.toDateString() === today.toDateString();
                      const classes = getClassesForSlot(dayIndex, hour);

                      return (
                        <DroppableCalendarCell
                          key={`${dayIndex}-${hour}`}
                          dayIndex={dayIndex}
                          hour={hour}
                          isToday={isToday}
                          currentHour={currentHour}
                          currentMinutes={currentMinutes}
                          classes={classes}
                          getColorForGroup={getColorForGroup}
                          onEditClass={handleEditClass}
                          onCellClick={handleCellClick}
                          dropPreview={dropPreview}
                          activeGroup={activeGroup}
                          draggingEvent={draggingEvent}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              </div>
            </div>

            {/* Groups Sidebar */}
            <div className="w-72 border-l border-[var(--border-default)] bg-[var(--surface-darker)] p-4 overflow-y-auto custom-scrollbar hidden lg:block">
              <h2 className="text-heading text-sm mb-2">{t("groups.title")}</h2>
              <p className="text-caption text-xs mb-4">
                {t("groups.dragGroup")}
              </p>
              {groups.length === 0 ? (
                <p className="text-caption text-center py-8">
                  {t("groups.noGroups")}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {groups.map((group) => (
                    <DraggableGroupItem
                      key={group.id}
                      group={group}
                      colorClass={getColorForGroup(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag Overlay - follows cursor */}
        <DragOverlay dropAnimation={null}>
          {activeGroup && (
            <div className="lesson-bank-item opacity-90 shadow-xl rotate-3 scale-105">
              <div className={`w-3 h-3 rounded-full ${getColorForGroup(activeGroup.id)} mb-1`} />
              <p className="text-sm text-white font-medium truncate">
                {activeGroup.name}
              </p>
            </div>
          )}
          {draggingEvent && (
            <div className={`calendar-class-card ${getColorForGroup(draggingEvent.group?.id || null)} opacity-90 shadow-xl rotate-2`}
              style={{ width: "140px", height: `${(draggingEvent.duration / 60) * CELL_HEIGHT - 4}px`, position: "relative" }}
            >
              <span className="text-white text-xs font-bold truncate">
                {draggingEvent.group?.name || t("event.noGroup")}
              </span>
              <span className="text-white/80 text-xs truncate">
                {draggingEvent.preparedLesson?.title || t("event.noLesson")}
              </span>
            </div>
          )}
        </DragOverlay>

        {/* Edit Class Modal */}
        {showModal && editingClass && (
          <div className="fixed inset-0 bg-black/50 flex-center z-50">
            <div className="surface-card w-full max-w-md p-6 m-4">
              <div className="flex-between mb-6">
                <div>
                  <h2 className="text-heading text-lg">{t("editModal.title")}</h2>
                  <p className="text-caption text-sm mt-1">
                    {editingClass.group?.name || t("event.noGroup")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingClass(null);
                  }}
                  className="btn-ghost btn-icon-sm"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveClass} className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">{t("editModal.lesson")}</label>
                  <select
                    value={formData.preparedLessonId}
                    onChange={(e) =>
                      setFormData({ ...formData, preparedLessonId: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="">{t("editModal.selectLesson")}</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("editModal.startTime")}</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="form-input"
                    step="300"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t("editModal.duration")}</label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) })
                    }
                    className="form-select"
                  >
                    <option value={15}>{t("durationOptions.15min")}</option>
                    <option value={20}>{t("durationOptions.20min")}</option>
                    <option value={25}>{t("durationOptions.25min")}</option>
                    <option value={30}>{t("durationOptions.30min")}</option>
                    <option value={45}>{t("durationOptions.45min")}</option>
                    <option value={60}>{t("durationOptions.1hour")}</option>
                    <option value={90}>{t("durationOptions.1.5hours")}</option>
                    <option value={120}>{t("durationOptions.2hours")}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t("editModal.notes")}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="form-textarea"
                    rows={2}
                    placeholder={t("editModal.notesPlaceholder")}
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleDeleteClass}
                    className="btn-danger btn-md"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    {t("editModal.delete")}
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingClass(null);
                    }}
                    className="btn-secondary btn-md"
                  >
                    {t("editModal.cancel")}
                  </button>
                  <button type="submit" className="btn-primary btn-md">
                    {t("editModal.save")}
                  </button>
                </div>

                {/* Start Session button - requires both group and lesson */}
                {editingClass.group && editingClass.preparedLesson ? (
                  <button
                    type="button"
                    onClick={() => startSession(editingClass.id)}
                    className="btn-primary btn-md w-full mt-2"
                  >
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                    {t("editModal.startSession")}
                  </button>
                ) : (
                  <p className="text-caption text-center text-sm mt-2">
                    {!editingClass.group && !editingClass.preparedLesson
                      ? t("errors.needGroupAndLesson")
                      : !editingClass.preparedLesson
                      ? t("errors.needLesson")
                      : t("errors.needGroup")}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      </PageContainer>
    </DndContext>
  );
}
