"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { ResourceIcon, EmptyState, ConfirmModal } from "@/components/common";

type ResourceType = "VIDEO" | "PDF" | "URL" | "TEXT";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string | null;
  content: string | null;
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

type ModalTab = "search" | "create";

export default function LessonEditorPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const t = useTranslations("lessonEditor");
  const { lessonId } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Exercise Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("search");
  const [resourceSearch, setResourceSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create Resource Form
  const [newResource, setNewResource] = useState({
    title: "",
    type: "URL" as ResourceType,
    url: "",
    content: "",
    duration: "",
  });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "exercise" | "lesson";
    exerciseId?: string;
    exerciseTitle?: string;
  }>({ isOpen: false, type: "exercise" });

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

  const handleAddFromResource = async (resource: Resource) => {
    if (!lesson) return;

    setSubmitting(true);
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
        closeModal();
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    setSubmitting(true);
    try {
      // First create the resource
      const resourcePayload = {
        title: newResource.title,
        type: newResource.type,
        url: newResource.type !== "TEXT" ? newResource.url : null,
        content: newResource.type === "TEXT" ? newResource.content : null,
        duration: newResource.duration ? parseInt(newResource.duration) : null,
      };

      const resourceRes = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resourcePayload),
      });

      if (resourceRes.ok) {
        const createdResource = await resourceRes.json();
        setResources([createdResource, ...resources]);

        // Then add it as an exercise
        const exerciseRes = await fetch(`/api/lessons/${lessonId}/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: createdResource.title,
            url: createdResource.url || "",
            resourceId: createdResource.id,
          }),
        });

        if (exerciseRes.ok) {
          const newExercise = await exerciseRes.json();
          setLesson({
            ...lesson,
            exercises: [...lesson.exercises, newExercise],
          });
          closeModal();
        }
      }
    } catch (error) {
      console.error("Failed to create resource:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setModalTab("search");
    setResourceSearch("");
    setNewResource({
      title: "",
      type: "URL",
      url: "",
      content: "",
      duration: "",
    });
  };

  const openDeleteExerciseModal = (exerciseId: string, exerciseTitle: string) => {
    setDeleteModal({ isOpen: true, type: "exercise", exerciseId, exerciseTitle });
  };

  const openDeleteLessonModal = () => {
    setDeleteModal({ isOpen: true, type: "lesson" });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.type === "exercise" && deleteModal.exerciseId && lesson) {
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
        fetchData();
      }
    } else if (deleteModal.type === "lesson") {
      try {
        await fetch(`/api/lessons/${lessonId}`, { method: "DELETE" });
        router.push("/dashboard/lessons");
      } catch (error) {
        console.error("Failed to delete lesson:", error);
      }
    }

    setDeleteModal({ isOpen: false, type: "exercise" });
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
            <span className="text-body">{t("loading")}</span>
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
          title={t("notFound")}
          description={t("notFoundDescription")}
          action={{
            label: t("backToLibrary"),
            onClick: () => router.push("/dashboard/lessons"),
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
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
          href="/dashboard/lessons"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {t("breadcrumbLessons")}
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
            {lesson.exercises.length === 1
              ? t("exercisesCountSingular", { count: lesson.exercises.length })
              : t("exercisesCount", { count: lesson.exercises.length })}
          </p>
        </div>
        <button onClick={openDeleteLessonModal} className="btn-ghost btn-sm text-red-400 hover:text-red-300">
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </header>

      {/* Exercises List */}
      {lesson.exercises.length === 0 ? (
        <EmptyState
          icon="playlist_add"
          title={t("noExercises")}
          description={t("noExercisesDescription")}
          action={{
            label: t("addExercise"),
            onClick: () => setShowAddModal(true),
          }}
        />
      ) : (
        <div className="space-y-2">
          {lesson.exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className="surface-card p-4 flex items-center gap-4 group"
            >
              {/* Index */}
              <span className="w-8 h-8 flex-center rounded-lg bg-[var(--surface-overlay)] text-sm font-semibold text-[var(--text-secondary)]">
                {index + 1}
              </span>

              {/* Resource Icon */}
              {exercise.resource && (
                <div className="w-10 h-10 flex-center rounded-lg bg-[var(--surface-overlay)]">
                  <ResourceIcon type={exercise.resource.type} size="sm" />
                </div>
              )}

              {/* Resource Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-heading text-sm truncate">{exercise.title}</h4>
                {exercise.url && (
                  <a
                    href={exercise.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-caption text-[var(--color-primary)] hover:underline truncate block"
                  >
                    {exercise.url}
                  </a>
                )}
              </div>

              {/* Duration Badge */}
              {exercise.resource?.duration && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-[var(--surface-overlay)] text-[var(--text-secondary)]">
                  {formatDuration(exercise.resource.duration)}
                </span>
              )}

              {/* Delete Action */}
              <button
                onClick={() => openDeleteExerciseModal(exercise.id, exercise.title)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Exercise Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full p-4 border-2 border-dashed border-[var(--border-default)] rounded-lg text-[var(--text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined">add</span>
        {t("addExercise")}
      </button>

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl surface-card overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 pb-0">
              <div className="flex-between mb-4">
                <h2 className="text-heading text-xl">{t("addExercise")}</h2>
                <button
                  onClick={closeModal}
                  className="p-1 rounded hover:bg-[var(--surface-hover)]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-[var(--border-default)]">
                <button
                  onClick={() => setModalTab("search")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    modalTab === "search"
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg align-middle mr-1">
                    search
                  </span>
                  {t("searchExisting")}
                </button>
                <button
                  onClick={() => setModalTab("create")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    modalTab === "create"
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg align-middle mr-1">
                    add
                  </span>
                  {t("createNew")}
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalTab === "search" ? (
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="form-search">
                    <span className="material-symbols-outlined form-search-icon">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={t("searchResources")}
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className="form-search-input"
                      autoFocus
                    />
                  </div>

                  {/* Resources Grid */}
                  {availableResources.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="material-symbols-outlined text-5xl text-[var(--text-muted)] mb-3">
                        {resourceSearch ? "search_off" : "folder_open"}
                      </span>
                      <p className="text-body mb-2">
                        {resourceSearch ? t("noResults") : t("allResourcesAdded")}
                      </p>
                      <button
                        onClick={() => setModalTab("create")}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {t("createNewResource")}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableResources.map((resource) => (
                        <button
                          key={resource.id}
                          onClick={() => handleAddFromResource(resource)}
                          disabled={submitting}
                          className="surface-card-interactive p-4 flex items-center gap-3 text-left disabled:opacity-50"
                        >
                          <div className="w-12 h-12 flex-center rounded-lg bg-[var(--surface-overlay)]">
                            <ResourceIcon type={resource.type} size="md" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {resource.title}
                            </h4>
                            <div className="flex items-center gap-2 text-caption">
                              <span>{resource.type}</span>
                              {resource.duration && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(resource.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-[var(--color-primary)]">
                            add_circle
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateAndAdd} className="space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="form-label">{t("resourceType")}</label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {(["VIDEO", "PDF", "URL", "TEXT"] as ResourceType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewResource({ ...newResource, type })}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            newResource.type === type
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                              : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
                          }`}
                        >
                          <ResourceIcon type={type} size="md" />
                          <p className="text-xs mt-1 text-[var(--text-secondary)]">
                            {type}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label htmlFor="resourceTitle" className="form-label">
                      {t("titleLabel")}
                    </label>
                    <input
                      type="text"
                      id="resourceTitle"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      className="form-input mt-1"
                      placeholder={t("titlePlaceholder")}
                      required
                    />
                  </div>

                  {/* URL (for VIDEO, PDF, URL types) */}
                  {["VIDEO", "PDF", "URL"].includes(newResource.type) && (
                    <div>
                      <label htmlFor="resourceUrl" className="form-label">
                        {t("urlLabel")}
                      </label>
                      <input
                        type="url"
                        id="resourceUrl"
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        className="form-input mt-1"
                        placeholder="https://"
                        required
                      />
                    </div>
                  )}

                  {/* Content (for TEXT type) */}
                  {newResource.type === "TEXT" && (
                    <div>
                      <label htmlFor="resourceContent" className="form-label">
                        {t("contentLabel")}
                      </label>
                      <textarea
                        id="resourceContent"
                        value={newResource.content}
                        onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                        className="form-textarea mt-1"
                        rows={4}
                        placeholder={t("contentPlaceholder")}
                        required
                      />
                    </div>
                  )}

                  {/* Duration */}
                  <div>
                    <label htmlFor="resourceDuration" className="form-label">
                      {t("durationLabel")}
                    </label>
                    <input
                      type="number"
                      id="resourceDuration"
                      value={newResource.duration}
                      onChange={(e) => setNewResource({ ...newResource, duration: e.target.value })}
                      className="form-input mt-1"
                      placeholder={t("durationPlaceholder")}
                      min="1"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="btn-ghost btn-md">
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary btn-md"
                    >
                      {submitting ? t("adding") : t("createAndAdd")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.type === "exercise" ? t("deleteExerciseTitle") : t("deleteLessonTitle")}
        message={
          deleteModal.type === "exercise"
            ? t("deleteExerciseMessage", { title: deleteModal.exerciseTitle || "" })
            : t("deleteLessonMessage", { title: lesson?.title || "" })
        }
        confirmText={t("delete")}
        variant="danger"
      />
    </PageContainer>
  );
}
