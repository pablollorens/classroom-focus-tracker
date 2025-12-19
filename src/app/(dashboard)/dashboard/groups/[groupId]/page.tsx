"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { Avatar, StatusBadge, EmptyState, ConfirmModal } from "@/components/common";
import { Toast } from "@/components/Toast";

interface Student {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}

interface Group {
  id: string;
  name: string;
  sessions: {
    id: string;
    isActive: boolean;
    preparedLesson: {
      title: string;
    };
  }[];
}

interface Lesson {
  id: string;
  title: string;
}

export default function GroupDetailsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [rawText, setRawText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Session State
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: "group" | "student";
    studentId?: string;
    studentName?: string;
  }>({ isOpen: false, type: "group" });

  // Fetch lessons when opening modal
  useEffect(() => {
    if (isStartingSession) {
      fetch("/api/lessons")
        .then((res) => res.json())
        .then((data) => setLessons(data))
        .catch((err) => console.error(err));
    }
  }, [isStartingSession]);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (!groupRes.ok) {
        if (groupRes.status === 404) router.push("/dashboard");
        return;
      }
      const groupData = await groupRes.json();
      setGroup(groupData);

      const studentsRes = await fetch(`/api/groups/${groupId}/students`);
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;

    setIsStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, preparedLessonId: selectedLessonId }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/dashboard/sessions/${session.id}`);
      } else {
        setToastMessage("Error al iniciar sesión");
        setShowToast(true);
      }
    } catch {
      setToastMessage("Error al iniciar sesión");
      setShowToast(true);
    } finally {
      setIsStarting(false);
    }
  };

  const openDeleteGroupModal = () => {
    setDeleteModal({ isOpen: true, type: "group" });
  };

  const openDeleteStudentModal = (studentId: string, studentName: string) => {
    setDeleteModal({ isOpen: true, type: "student", studentId, studentName });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.type === "group") {
      try {
        const res = await fetch(`/api/groups/${groupId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          router.push("/dashboard");
        } else {
          setToastMessage("Error al eliminar grupo");
          setShowToast(true);
        }
      } catch {
        setToastMessage("Error al eliminar grupo");
        setShowToast(true);
      }
    } else if (deleteModal.type === "student" && deleteModal.studentId) {
      const previousStudents = [...students];
      setStudents(students.filter((s) => s.id !== deleteModal.studentId));

      try {
        const res = await fetch(
          `/api/groups/${groupId}/students/${deleteModal.studentId}`,
          { method: "DELETE" }
        );

        if (res.ok) {
          setToastMessage("Estudiante eliminado");
          setShowToast(true);
        } else {
          setStudents(previousStudents);
          setToastMessage("Error al eliminar estudiante");
          setShowToast(true);
        }
      } catch {
        setStudents(previousStudents);
        setToastMessage("Error al eliminar estudiante");
        setShowToast(true);
      }
    }

    setDeleteModal({ isOpen: false, type: "group" });
  };

  const generateUsername = (firstName: string, lastName: string) => {
    const sanitize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const f = sanitize(firstName);
    const l = sanitize(lastName);
    return `${f}.${l}`;
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setIsProcessing(true);

    const lines = rawText.split("\n").filter((line) => line.trim() !== "");
    let successCount = 0;
    let dupCount = 0;
    let errorCount = 0;

    for (const line of lines) {
      const parts = line.trim().split(" ");
      if (parts.length < 1) continue;

      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "Student";
      const username = generateUsername(firstName, lastName);

      try {
        const res = await fetch(`/api/groups/${groupId}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, username }),
        });

        if (res.ok) {
          successCount++;
        } else if (res.status === 409) {
          dupCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setRawText("");
    setIsProcessing(false);
    setIsAddingStudent(false);
    fetchData();

    if (successCount > 0 || dupCount > 0 || errorCount > 0) {
      setToastMessage(
        `Añadidos: ${successCount}, Omitidos: ${dupCount}, Errores: ${errorCount}`
      );
      setShowToast(true);
    }
  };

  const activeSession = group?.sessions?.[0];

  if (loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">Cargando grupo...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!group) return null;

  return (
    <PageContainer>
      {/* Active Session Banner */}
      {activeSession && (
        <div className="surface-card-highlight p-4 flex items-center justify-between animate-pulse-glow">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined text-2xl text-green-400">
                sensors
              </span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
            </div>
            <div>
              <p className="text-heading text-sm">Sesión Activa</p>
              <p className="text-caption">{activeSession.preparedLesson.title}</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/dashboard/sessions/${activeSession.id}`)}
            className="btn-primary btn-sm"
          >
            <span className="material-symbols-outlined text-lg">
              visibility
            </span>
            Monitorear
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Dashboard
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)] font-medium">
          {group.name}
        </span>
      </nav>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-xl">{group.name}</h1>
          <p className="text-body mt-1">
            {students.length} {students.length === 1 ? "estudiante" : "estudiantes"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsAddingStudent(true)}
            className="btn-primary btn-md"
          >
            <span className="material-symbols-outlined text-lg">
              person_add
            </span>
            Añadir Estudiantes
          </button>

          {!activeSession && (
            <button
              onClick={() => setIsStartingSession(true)}
              className="btn-secondary btn-md"
            >
              <span className="material-symbols-outlined text-lg">
                play_circle
              </span>
              Iniciar Sesión
            </button>
          )}

          <button onClick={openDeleteGroupModal} className="btn-danger btn-md">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-container-md icon-primary">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {students.length}
              </p>
              <p className="text-caption">Total Estudiantes</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-container-md icon-muted">
              <span className="material-symbols-outlined">local_library</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {lessons.length || "—"}
              </p>
              <p className="text-caption">Lecciones</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-container-md" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", color: "rgb(34, 197, 94)" }}>
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {activeSession ? "En vivo" : "—"}
              </p>
              <p className="text-caption">Estado</p>
            </div>
          </div>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-container-md" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "rgb(245, 158, 11)" }}>
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">—</p>
              <p className="text-caption">Próxima Clase</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {students.length === 0 ? (
        <EmptyState
          icon="person_off"
          title="Sin estudiantes"
          description="Añade estudiantes a este grupo para comenzar a monitorear su progreso."
          action={{
            label: "Añadir Estudiantes",
            onClick: () => setIsAddingStudent(true),
          }}
        />
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left p-4 text-label">Estudiante</th>
                  <th className="text-left p-4 text-label hidden sm:table-cell">
                    Usuario
                  </th>
                  <th className="text-right p-4 text-label">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/groups/${groupId}/students/${student.id}`
                      )
                    }
                    className="border-b border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${student.firstName} ${student.lastName}`}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-caption sm:hidden">
                            @{student.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="text-[var(--text-secondary)]">
                        @{student.username}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteStudentModal(student.id, `${student.firstName} ${student.lastName}`);
                        }}
                        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">Añadir Estudiantes</h2>
              <button
                onClick={() => setIsAddingStudent(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleBulkAdd} className="space-y-4">
              <div>
                <label htmlFor="studentList" className="form-label">
                  Lista de estudiantes (uno por línea: Nombre Apellido)
                </label>
                <textarea
                  id="studentList"
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="form-textarea mt-1 font-mono"
                  placeholder={"Juan Pérez\nMaría García\nCarlos López"}
                  required
                  autoFocus
                />
                <p className="form-hint">
                  Se generará automáticamente un usuario único para cada
                  estudiante.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="btn-ghost btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary btn-md"
                >
                  {isProcessing ? "Añadiendo..." : "Añadir Estudiantes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start Session Modal */}
      {isStartingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">Iniciar Sesión</h2>
              <button
                onClick={() => setIsStartingSession(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label htmlFor="lessonSelect" className="form-label">
                  Seleccionar Lección
                </label>
                <select
                  id="lessonSelect"
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="form-select mt-1"
                  required
                >
                  <option value="">-- Elige una lección --</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
                <p className="form-hint">
                  ¿No ves tu lección?{" "}
                  <Link
                    href="/dashboard/lessons?tab=lessons"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    Crear una nueva
                  </Link>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStartingSession(false)}
                  className="btn-ghost btn-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isStarting || !selectedLessonId}
                  className="btn-primary btn-md"
                >
                  {isStarting ? "Iniciando..." : "Comenzar Sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.type === "group" ? "Eliminar grupo" : "Eliminar estudiante"}
        message={
          deleteModal.type === "group"
            ? `¿Estás seguro de eliminar "${group?.name}" y TODOS sus estudiantes? Esta acción no se puede deshacer.`
            : `¿Estás seguro de eliminar a "${deleteModal.studentName}" del grupo?`
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </PageContainer>
  );
}
