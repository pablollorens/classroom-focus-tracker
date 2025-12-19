"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { ResourceIcon, EmptyState, ConfirmModal } from "@/components/common";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ResourceType = "VIDEO" | "PDF" | "URL" | "TEXT";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string | null;
  duration: number | null;
}

interface Exercise {
  id: string;
  title: string;
  url: string;
  orderIndex: number;
  resourceId?: string;
  resource?: Resource;
}

interface Lesson {
  id: string;
  title: string;
  exercises: Exercise[];
}

// Sortable Exercise Item Component
function SortableExerciseItem({
  exercise,
  index,
  onDelete,
}: {
  exercise: Exercise;
  index: number;
  onDelete: (id: string, title: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`surface-card p-4 flex items-center gap-4 group ${
        isDragging ? "shadow-lg ring-2 ring-[var(--color-primary)]" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        <span className="material-symbols-outlined">drag_indicator</span>
      </button>

      {/* Index */}
      <span className="w-8 h-8 flex-center rounded-lg bg-[var(--surface-overlay)] text-sm font-semibold text-[var(--text-secondary)]">
        {index + 1}
      </span>

      {/* Resource Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-heading text-sm truncate">{exercise.title}</h4>
        <a
          href={exercise.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-caption text-[var(--color-primary)] hover:underline truncate block"
        >
          {exercise.url}
        </a>
      </div>

      {/* Actions */}
      <button
        onClick={() => onDelete(exercise.id, exercise.title)}
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <span className="material-symbols-outlined text-xl">delete</span>
      </button>
    </div>
  );
}

// Draggable Resource Card (from library sidebar)
function DraggableResourceCard({
  resource,
  onAdd,
}: {
  resource: Resource;
  onAdd: (resource: Resource) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resource-${resource.id}`,
    data: { type: "resource", resource },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(resource)}
      className={`surface-card-interactive p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-[var(--color-primary)]" : ""
      }`}
    >
      <div className="w-10 h-10 flex-center rounded-lg bg-[var(--surface-overlay)]">
        <ResourceIcon type={resource.type} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
          {resource.title}
        </h4>
        <p className="text-caption">{resource.type}</p>
      </div>
      <span className="material-symbols-outlined text-[var(--text-muted)]">
        drag_indicator
      </span>
    </div>
  );
}

// Droppable zone for exercises
function ExercisesDropZone({
  children,
  isEmpty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "exercises-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg transition-colors ${
        isOver
          ? "bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)] ring-dashed"
          : ""
      } ${isEmpty ? "flex items-center justify-center" : ""}`}
    >
      {children}
    </div>
  );
}

export default function LessonEditorPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Manual add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sidebar toggle (mobile)
  const [showSidebar, setShowSidebar] = useState(false);

  // Search
  const [resourceSearch, setResourceSearch] = useState("");

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "exercise" | "lesson";
    exerciseId?: string;
    exerciseTitle?: string;
  }>({ isOpen: false, type: "exercise" });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const fetchData = async () => {
    try {
      const [lessonRes, resourcesRes] = await Promise.all([
        fetch(`/api/lessons/${lessonId}`),
        fetch("/api/resources"),
      ]);

      if (lessonRes.ok) {
        const lessonData = await lessonRes.json();
        setLesson(lessonData);
      }

      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter resources not already in lesson
  const availableResources = resources.filter((r) => {
    const inLesson = lesson?.exercises.some(
      (e) => e.resourceId === r.id || e.url === r.url
    );
    const matchesSearch =
      r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.type.toLowerCase().includes(resourceSearch.toLowerCase());
    return !inLesson && matchesSearch;
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || !lesson) return;

    const activeIdStr = active.id as string;

    // Check if dragging a resource from the library
    if (activeIdStr.startsWith("resource-")) {
      // Dropped on the exercises zone or on an existing exercise
      if (over.id === "exercises-drop-zone" || lesson.exercises.some(e => e.id === over.id)) {
        const resourceData = active.data.current?.resource as Resource | undefined;
        if (resourceData) {
          handleAddFromResource(resourceData);
        }
      }
      return;
    }

    // Otherwise, it's a reorder of existing exercises
    if (active.id !== over.id) {
      const oldIndex = lesson.exercises.findIndex((e) => e.id === active.id);
      const newIndex = lesson.exercises.findIndex((e) => e.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newExercises = arrayMove(lesson.exercises, oldIndex, newIndex);
      setLesson({ ...lesson, exercises: newExercises });

      // Save new order to API
      try {
        await fetch(`/api/lessons/${lessonId}/exercises/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseIds: newExercises.map((e) => e.id),
          }),
        });
      } catch (error) {
        console.error("Failed to reorder:", error);
        fetchData(); // Revert on error
      }
    }
  };

  const handleAddFromResource = async (resource: Resource) => {
    if (!lesson) return;

    try {
      const res = await fetch(`/api/lessons/${lessonId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resource.title,
          url: resource.url || "",
          resourceId: resource.id,
        }),
      });

      if (res.ok) {
        const newExercise = await res.json();
        setLesson({
          ...lesson,
          exercises: [...lesson.exercises, newExercise],
        });
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          url: manualUrl,
        }),
      });

      if (res.ok) {
        const newExercise = await res.json();
        setLesson({
          ...lesson,
          exercises: [...lesson.exercises, newExercise],
        });
        setManualTitle("");
        setManualUrl("");
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteExerciseModal = (exerciseId: string, exerciseTitle: string) => {
    setDeleteModal({ isOpen: true, type: "exercise", exerciseId, exerciseTitle });
  };

  const openDeleteLessonModal = () => {
    setDeleteModal({ isOpen: true, type: "lesson" });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.type === "exercise" && deleteModal.exerciseId && lesson) {
      // Optimistic update
      setLesson({
        ...lesson,
        exercises: lesson.exercises.filter((e) => e.id !== deleteModal.exerciseId),
      });

      try {
        await fetch(`/api/lessons/${lessonId}/exercises/${deleteModal.exerciseId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete:", error);
        fetchData(); // Revert
      }
    } else if (deleteModal.type === "lesson") {
      try {
        await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
        router.push("/dashboard/lessons?tab=lessons");
      } catch (error) {
        console.error("Failed to delete lesson:", error);
      }
    }

    setDeleteModal({ isOpen: false, type: "exercise" });
  };

  const activeExercise = activeId
    ? lesson?.exercises.find((e) => e.id === activeId)
    : null;

  const activeResource = activeId?.startsWith("resource-")
    ? resources.find((r) => `resource-${r.id}` === activeId)
    : null;

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">Cargando lección...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!lesson) {
    return (
      <PageContainer>
        <EmptyState
          icon="error"
          title="Lección no encontrada"
          description="La lección que buscas no existe o fue eliminada."
          action={{
            label: "Volver a Biblioteca",
            onClick: () => router.push("/dashboard/lessons"),
          }}
        />
      </PageContainer>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-60px)]">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/dashboard"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Dashboard
              </Link>
              <span className="text-[var(--text-muted)]">/</span>
              <Link
                href="/dashboard/lessons?tab=lessons"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Lecciones
              </Link>
              <span className="text-[var(--text-muted)]">/</span>
              <span className="text-[var(--text-primary)] font-medium">
                {lesson.title}
              </span>
            </nav>

            {/* Header */}
            <header className="flex-between">
              <div>
                <h1 className="text-heading-xl">{lesson.title}</h1>
                <p className="text-body mt-1">
                  {lesson.exercises.length} ejercicios
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Mobile sidebar toggle */}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="btn-secondary btn-sm lg:hidden"
                >
                  <span className="material-symbols-outlined text-lg">
                    library_add
                  </span>
                  Recursos
                </button>
                <button onClick={openDeleteLessonModal} className="btn-ghost btn-sm text-red-400 hover:text-red-300">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </header>

            {/* Exercises List */}
            <ExercisesDropZone isEmpty={lesson.exercises.length === 0}>
              {lesson.exercises.length === 0 ? (
                <EmptyState
                  icon="playlist_add"
                  title="Sin ejercicios"
                  description="Arrastra recursos desde la biblioteca o haz clic en ellos para añadirlos."
                  action={{
                    label: "Añadir Ejercicio Manual",
                    onClick: () => setShowAddForm(true),
                  }}
                />
              ) : (
                <SortableContext
                  items={lesson.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {lesson.exercises.map((exercise, index) => (
                      <SortableExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        index={index}
                        onDelete={openDeleteExerciseModal}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </ExercisesDropZone>

            {/* Add Exercise Button */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-4 border-2 border-dashed border-[var(--border-default)] rounded-lg text-[var(--text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Añadir Ejercicio Manual
            </button>
          </div>
        </div>

      {/* Resources Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 right-0 z-40
          w-80 bg-[var(--surface-darker)] border-l border-[var(--border-default)]
          transform transition-transform duration-300
          ${showSidebar ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[var(--border-default)] flex-between">
            <h2 className="text-heading text-lg">Biblioteca</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-1 hover:bg-[var(--surface-hover)] rounded"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="form-search">
              <span className="material-symbols-outlined form-search-icon">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar recursos..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className="form-search-input"
              />
            </div>
          </div>

          {/* Resources List */}
          <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
            {availableResources.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-[var(--text-muted)] mb-2">
                  folder_open
                </span>
                <p className="text-caption">
                  {resourceSearch
                    ? "Sin resultados"
                    : "Todos los recursos ya fueron añadidos"}
                </p>
                <Link
                  href="/dashboard/lessons?tab=resources"
                  className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block"
                >
                  Crear nuevo recurso
                </Link>
              </div>
            ) : (
              availableResources.map((resource) => (
                <DraggableResourceCard
                  key={resource.id}
                  resource={resource}
                  onAdd={handleAddFromResource}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Manual Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">Añadir Ejercicio</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-4">
              <div>
                <label htmlFor="exerciseTitle" className="form-label">
                  Título
                </label>
                <input
                  type="text"
                  id="exerciseTitle"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="form-input mt-1"
                  placeholder="Ej: Lectura sobre fracciones"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="exerciseUrl" className="form-label">
                  URL del contenido
                </label>
                <input
                  type="url"
                  id="exerciseUrl"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="form-input mt-1"
                  placeholder="https://"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-ghost btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? "Añadiendo..." : "Añadir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeExercise ? (
          <div className="surface-card p-4 flex items-center gap-4 shadow-xl ring-2 ring-[var(--color-primary)]">
            <span className="material-symbols-outlined text-[var(--text-muted)]">
              drag_indicator
            </span>
            <span className="w-8 h-8 flex-center rounded-lg bg-[var(--surface-overlay)] text-sm font-semibold">
              •
            </span>
            <div className="flex-1">
              <h4 className="text-heading text-sm">{activeExercise.title}</h4>
            </div>
          </div>
        ) : activeResource ? (
          <div className="surface-card p-3 flex items-center gap-3 shadow-xl ring-2 ring-[var(--color-primary)]">
            <div className="w-10 h-10 flex-center rounded-lg bg-[var(--surface-overlay)]">
              <ResourceIcon type={activeResource.type} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                {activeResource.title}
              </h4>
              <p className="text-caption">{activeResource.type}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.type === "exercise" ? "Eliminar ejercicio" : "Eliminar lección"}
        message={
          deleteModal.type === "exercise"
            ? `¿Estás seguro de eliminar "${deleteModal.exerciseTitle}" de esta lección?`
            : `¿Estás seguro de eliminar "${lesson?.title}" y todos sus ejercicios? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
    </DndContext>
  );
}
