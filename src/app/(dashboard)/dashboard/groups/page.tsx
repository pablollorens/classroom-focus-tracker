"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { StatusBadge, EmptyState, ConfirmModal } from "@/components/common";

interface Group {
  id: string;
  name: string;
  _count: {
    students: number;
  };
  createdAt: string;
  sessions?: {
    id: string;
    preparedLesson: {
      title: string;
    };
  }[];
}

export default function GroupsPage() {
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tg = useTranslations("groups");
  const tc = useTranslations("common");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({ isOpen: false, id: "", name: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchGroups();
    }
  }, [status, router]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (res.ok) {
        const newGroup = await res.json();
        setNewGroupName("");
        setIsCreating(false);
        router.push(`/dashboard/groups/${newGroup.id}`);
      }
    } catch (error) {
      console.error("Failed to create group", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, name });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setGroups(groups.filter((g) => g.id !== id));
    setDeleteModal({ isOpen: false, id: "", name: "" });

    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" });
    } catch {
      fetchGroups();
    }
  };

  if (status === "loading" || loading) {
    return (
      <PageContainer>
        <div className="flex-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-body">{tc("loading")}</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <section className="flex-between">
        <div>
          <h1 className="text-heading-xl mb-2">{tg("title")}s</h1>
          <p className="text-body">{t("noGroupsDescription")}</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary btn-md"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t("newGroup")}
        </button>
      </section>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <EmptyState
          icon="groups"
          title={t("noGroups")}
          description={t("noGroupsDescription")}
          action={{
            label: t("createGroup"),
            onClick: () => setIsCreating(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => {
            const hasActiveSession = group.sessions && group.sessions.length > 0;
            return (
              <Link
                key={group.id}
                href={`/dashboard/groups/${group.id}`}
                className="surface-card-interactive group relative overflow-hidden"
              >
                {/* Thumbnail Area */}
                <div className="h-32 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--surface-darker)] flex-center relative">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-4xl">
                    groups
                  </span>

                  {/* Live Badge */}
                  {hasActiveSession && (
                    <div className="absolute top-2 left-2">
                      <StatusBadge status="live" />
                    </div>
                  )}

                  {/* Student Count Badge */}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-semibold rounded bg-black/50 text-white">
                    {group._count.students === 1
                      ? tg("studentCountSingular", { count: group._count.students })
                      : tg("studentCount", { count: group._count.students })}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => openDeleteModal(e, group.id, group.name)}
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
                    {group.name}
                  </h3>
                  <p className="text-caption">
                    {new Date(group.createdAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">{t("newGroup")}</h2>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="groupName" className="form-label">
                  {t("groupName")}
                </label>
                <input
                  type="text"
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="form-input mt-1"
                  placeholder={t("groupNamePlaceholder")}
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="btn-ghost btn-md"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? tc("saving") : t("createGroup")}
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
        title={tg("deleteGroup")}
        message={tg("deleteGroupConfirm", { name: deleteModal.name })}
        confirmText={tc("delete")}
        variant="danger"
      />
    </PageContainer>
  );
}
