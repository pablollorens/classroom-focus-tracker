"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { ResourceIcon, EmptyState } from "@/components/common";

type ResourceType = "VIDEO" | "PDF" | "URL" | "TEXT";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string | null;
  content: string | null;
  duration: number | null;
  createdAt: string;
}

interface Lesson {
  id: string;
  title: string;
  createdAt: string;
  _count: {
    exercises: number;
  };
}

type TabType = "resources" | "lessons";

const resourceTypes: { value: ResourceType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "VIDEO", label: "Video" },
  { value: "PDF", label: "PDF" },
  { value: "URL", label: "Enlace" },
  { value: "TEXT", label: "Texto" },
];

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "resources"
  );
  const [resources, setResources] = useState<Resource[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "ALL">("ALL");

  // Resource Modal State
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    type: "URL" as ResourceType,
    url: "",
    content: "",
    duration: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, lessonsRes] = await Promise.all([
        fetch("/api/resources"),
        fetch("/api/lessons"),
      ]);

      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData);
      }

      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.replace(`/dashboard/lessons?tab=${tab}`, { scroll: false });
  };

  // Filter resources
  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resourceForm.title,
          type: resourceForm.type,
          url: resourceForm.url || null,
          content: resourceForm.content || null,
          duration: resourceForm.duration ? parseInt(resourceForm.duration) : null,
        }),
      });

      if (res.ok) {
        const newResource = await res.json();
        setResources([newResource, ...resources]);
        setShowResourceModal(false);
        setResourceForm({
          title: "",
          type: "URL",
          url: "",
          content: "",
          duration: "",
        });
      }
    } catch (error) {
      console.error("Error creating resource:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: lessonTitle }),
      });

      if (res.ok) {
        const newLesson = await res.json();
        router.push(`/dashboard/lessons/${newLesson.id}`);
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de eliminar este recurso?")) return;

    setResources(resources.filter((r) => r.id !== id));

    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
    } catch (error) {
      fetchData();
    }
  };

  const handleDeleteLesson = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de eliminar esta lección?")) return;

    setLessons(lessons.filter((l) => l.id !== id));

    try {
      await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    } catch (error) {
      fetchData();
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">Cargando biblioteca...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <section>
        <h1 className="text-heading-xl mb-2">Biblioteca</h1>
        <p className="text-body">
          Gestiona tus recursos educativos y organiza lecciones.
        </p>
      </section>

      {/* Tabs */}
      <div className="border-b border-[var(--border-default)]">
        <nav className="flex gap-1" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("resources")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "resources"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">folder</span>
              Recursos
              <span className="bg-[var(--surface-overlay)] px-2 py-0.5 rounded-full text-xs">
                {resources.length}
              </span>
            </span>
          </button>
          <button
            onClick={() => handleTabChange("lessons")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "lessons"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">
                local_library
              </span>
              Lecciones
              <span className="bg-[var(--surface-overlay)] px-2 py-0.5 rounded-full text-xs">
                {lessons.length}
              </span>
            </span>
          </button>
        </nav>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              search
            </span>
            <input
              type="text"
              placeholder={
                activeTab === "resources"
                  ? "Buscar recursos..."
                  : "Buscar lecciones..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>

          {/* Type Filter (Resources only) */}
          {activeTab === "resources" && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {resourceTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTypeFilter(type.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    typeFilter === type.value
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Button */}
        <button
          onClick={() =>
            activeTab === "resources"
              ? setShowResourceModal(true)
              : setShowLessonModal(true)
          }
          className="btn-primary btn-md self-start"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {activeTab === "resources" ? "Nuevo Recurso" : "Nueva Lección"}
        </button>
      </div>

      {/* Content */}
      {activeTab === "resources" ? (
        filteredResources.length === 0 ? (
          <EmptyState
            icon="folder_open"
            title={searchQuery || typeFilter !== "ALL" ? "Sin resultados" : "Sin recursos"}
            description={
              searchQuery || typeFilter !== "ALL"
                ? "No se encontraron recursos con esos filtros."
                : "Agrega recursos como videos, PDFs o enlaces para usarlos en tus lecciones."
            }
            action={
              !searchQuery && typeFilter === "ALL"
                ? {
                    label: "Agregar Recurso",
                    onClick: () => setShowResourceModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResources.map((resource) => (
              <div
                key={resource.id}
                className="surface-card-interactive group relative overflow-hidden"
              >
                {/* Thumbnail Area */}
                <div className="h-32 bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-darker)] flex-center relative">
                  <ResourceIcon type={resource.type} size="lg" />

                  {/* Type Badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded bg-black/50 text-white">
                    {resource.type}
                  </span>

                  {/* Duration Badge */}
                  {resource.duration && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-semibold rounded bg-black/50 text-white">
                      {formatDuration(resource.duration)}
                    </span>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteResource(e, resource.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-heading text-sm line-clamp-2 mb-1">
                    {resource.title}
                  </h3>
                  {resource.url && (
                    <p className="text-caption truncate">{resource.url}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredLessons.length === 0 ? (
        <EmptyState
          icon="local_library"
          title={searchQuery ? "Sin resultados" : "Sin lecciones"}
          description={
            searchQuery
              ? "No se encontraron lecciones con ese nombre."
              : "Crea tu primera lección para organizar recursos y ejercicios."
          }
          action={
            !searchQuery
              ? {
                  label: "Crear Lección",
                  onClick: () => setShowLessonModal(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
              className="surface-card-interactive group relative overflow-hidden cursor-pointer"
            >
              {/* Thumbnail Area */}
              <div className="h-32 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--surface-darker)] flex-center relative">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-4xl">
                  menu_book
                </span>

                {/* Exercise Count Badge */}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-semibold rounded bg-black/50 text-white">
                  {lesson._count.exercises} ejercicios
                </span>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteLesson(e, lesson.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <span className="material-symbols-outlined text-lg">
                    delete
                  </span>
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-heading text-sm line-clamp-2 mb-1">
                  {lesson.title}
                </h3>
                <p className="text-caption">
                  {new Date(lesson.createdAt).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">Nuevo Recurso</h2>
              <button
                onClick={() => setShowResourceModal(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="form-label">Tipo de Recurso</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(["VIDEO", "PDF", "URL", "TEXT"] as ResourceType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setResourceForm({ ...resourceForm, type })
                        }
                        className={`p-3 rounded-lg border text-center transition-all ${
                          resourceForm.type === type
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                            : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        <ResourceIcon type={type} size="md" />
                        <p className="text-xs mt-1 text-[var(--text-secondary)]">
                          {type}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="resourceTitle" className="form-label">
                  Título
                </label>
                <input
                  type="text"
                  id="resourceTitle"
                  value={resourceForm.title}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, title: e.target.value })
                  }
                  className="form-input mt-1"
                  placeholder="Ej: Introducción a las fracciones"
                  required
                  autoFocus
                />
              </div>

              {/* URL (for VIDEO, PDF, URL types) */}
              {["VIDEO", "PDF", "URL"].includes(resourceForm.type) && (
                <div>
                  <label htmlFor="resourceUrl" className="form-label">
                    URL
                  </label>
                  <input
                    type="url"
                    id="resourceUrl"
                    value={resourceForm.url}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, url: e.target.value })
                    }
                    className="form-input mt-1"
                    placeholder="https://"
                    required
                  />
                </div>
              )}

              {/* Content (for TEXT type) */}
              {resourceForm.type === "TEXT" && (
                <div>
                  <label htmlFor="resourceContent" className="form-label">
                    Contenido
                  </label>
                  <textarea
                    id="resourceContent"
                    value={resourceForm.content}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        content: e.target.value,
                      })
                    }
                    className="form-textarea mt-1"
                    rows={4}
                    placeholder="Escribe el contenido aquí..."
                    required
                  />
                </div>
              )}

              {/* Duration */}
              <div>
                <label htmlFor="resourceDuration" className="form-label">
                  Duración (minutos, opcional)
                </label>
                <input
                  type="number"
                  id="resourceDuration"
                  value={resourceForm.duration}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      duration: e.target.value,
                    })
                  }
                  className="form-input mt-1"
                  placeholder="15"
                  min="1"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="btn-ghost btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? "Guardando..." : "Crear Recurso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">Nueva Lección</h2>
              <button
                onClick={() => setShowLessonModal(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label htmlFor="lessonTitle" className="form-label">
                  Nombre de la Lección
                </label>
                <input
                  type="text"
                  id="lessonTitle"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="form-input mt-1"
                  placeholder="Ej: Matemáticas - Capítulo 4"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="btn-ghost btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? "Creando..." : "Crear y Editar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
