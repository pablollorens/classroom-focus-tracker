"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { EmptyState, ConfirmModal } from "@/components/common";

interface Lesson {
  id: string;
  title: string;
  createdAt: string;
  _count: {
    exercises: number;
  };
}

export default function LessonsPage() {
  const t = useTranslations("lessons");
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
  }>({ isOpen: false, id: "", title: "" });

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lessons");
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const openDeleteModal = (
    e: React.MouseEvent,
    id: string,
    title: string
  ) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, title });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setLessons(lessons.filter((l) => l.id !== id));

    try {
      await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    } catch {
      fetchLessons();
    }

    setDeleteModal({ isOpen: false, id: "", title: "" });
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

  return (
    <PageContainer>
      {/* Header */}
      <section>
        <h1 className="text-heading-xl mb-2">{t("title")}</h1>
        <p className="text-body">{t("subtitle")}</p>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="form-search flex-1 max-w-md">
            <span className="material-symbols-outlined form-search-icon">
              search
            </span>
            <input
              type="text"
              placeholder={t("searchLessons")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-search-input"
            />
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowLessonModal(true)}
          className="btn-primary btn-md self-start"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t("newLesson")}
        </button>
      </div>

      {/* Content */}
      {filteredLessons.length === 0 ? (
        <EmptyState
          icon="local_library"
          title={searchQuery ? t("noResults") : t("noLessons")}
          description={
            searchQuery
              ? t("noLessonsFiltered")
              : t("noLessonsDescription")
          }
          action={
            !searchQuery
              ? {
                  label: t("createLesson"),
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
                  {t("exercisesCount", { count: lesson._count.exercises })}
                </span>

                {/* Delete Button */}
                <button
                  onClick={(e) => openDeleteModal(e, lesson.id, lesson.title)}
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

      {/* Create Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">{t("newLesson")}</h2>
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
                  {t("lessonNameLabel")}
                </label>
                <input
                  type="text"
                  id="lessonTitle"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="form-input mt-1"
                  placeholder={t("lessonNamePlaceholder")}
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
                  {t("cancelButton")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? t("creatingButton") : t("createAndEditButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={t("deleteLessonTitle")}
        message={t("deleteLessonMessage", { title: deleteModal.title })}
        confirmText={t("confirmDeleteButton")}
        variant="danger"
      />
    </PageContainer>
  );
}
