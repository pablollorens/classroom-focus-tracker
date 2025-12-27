"use client";

import { useState, useEffect } from "react";
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
  createdAt: string;
}

const RESOURCE_TYPE_VALUES: (ResourceType | "ALL")[] = ["ALL", "VIDEO", "PDF", "URL", "TEXT"];

export default function ResourcesPage() {
  const t = useTranslations("resources");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "ALL">("ALL");

  // Resource Modal State
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    type: "URL" as ResourceType,
    url: "",
    content: "",
    duration: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
  }>({ isOpen: false, id: "", title: "" });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources");
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter resources
  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || resource.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openResourceModal = (resource?: Resource) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        title: resource.title,
        type: resource.type,
        url: resource.url || "",
        content: resource.content || "",
        duration: resource.duration?.toString() || "",
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        title: "",
        type: "URL",
        url: "",
        content: "",
        duration: "",
      });
    }
    setShowResourceModal(true);
  };

  const closeResourceModal = () => {
    setShowResourceModal(false);
    setEditingResource(null);
    setResourceForm({
      title: "",
      type: "URL",
      url: "",
      content: "",
      duration: "",
    });
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: resourceForm.title,
      type: resourceForm.type,
      url: resourceForm.url || null,
      content: resourceForm.content || null,
      duration: resourceForm.duration ? parseInt(resourceForm.duration) : null,
    };

    try {
      if (editingResource) {
        const res = await fetch(`/api/resources/${editingResource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updatedResource = await res.json();
          setResources(resources.map((r) =>
            r.id === editingResource.id ? updatedResource : r
          ));
          closeResourceModal();
        }
      } else {
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const newResource = await res.json();
          setResources([newResource, ...resources]);
          closeResourceModal();
        }
      }
    } catch (error) {
      console.error("Error saving resource:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResourceFromModal = async () => {
    if (!editingResource) return;

    setResources(resources.filter((r) => r.id !== editingResource.id));
    closeResourceModal();

    try {
      await fetch(`/api/resources/${editingResource.id}`, { method: "DELETE" });
    } catch {
      fetchResources();
    }
  };

  const openDeleteModal = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, id, title });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setResources(resources.filter((r) => r.id !== id));
    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
    } catch {
      fetchResources();
    }
    setDeleteModal({ isOpen: false, id: "", title: "" });
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
              placeholder={t("searchResources")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-search-input"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {RESOURCE_TYPE_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  typeFilter === value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--surface-overlay)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {t(`filter${value === "ALL" ? "All" : value === "URL" ? "URL" : value.charAt(0) + value.slice(1).toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => openResourceModal()}
          className="btn-primary btn-md self-start"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t("newResource")}
        </button>
      </div>

      {/* Content */}
      {filteredResources.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title={searchQuery || typeFilter !== "ALL" ? t("noResults") : t("noResources")}
          description={
            searchQuery || typeFilter !== "ALL"
              ? t("noResourcesFiltered")
              : t("noResourcesDescription")
          }
          action={
            !searchQuery && typeFilter === "ALL"
              ? {
                  label: t("addResource"),
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
              onClick={() => openResourceModal(resource)}
              className="surface-card-interactive group relative overflow-hidden cursor-pointer"
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
                  onClick={(e) => openDeleteModal(e, resource.id, resource.title)}
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
      )}

      {/* Resource Modal (Create/Edit) */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg surface-card p-6">
            <div className="flex-between mb-6">
              <h2 className="text-heading text-xl">
                {editingResource ? t("editResource") : t("newResource")}
              </h2>
              <button
                onClick={closeResourceModal}
                className="p-1 rounded hover:bg-[var(--surface-hover)]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="form-label">{t("resourceType")}</label>
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
                  {t("titleLabel")}
                </label>
                <input
                  type="text"
                  id="resourceTitle"
                  value={resourceForm.title}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, title: e.target.value })
                  }
                  className="form-input mt-1"
                  placeholder={t("titlePlaceholder")}
                  required
                  autoFocus
                />
              </div>

              {/* URL (for VIDEO, PDF, URL types) */}
              {["VIDEO", "PDF", "URL"].includes(resourceForm.type) && (
                <div>
                  <label htmlFor="resourceUrl" className="form-label">
                    {t("urlLabel")}
                  </label>
                  <input
                    type="url"
                    id="resourceUrl"
                    value={resourceForm.url}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, url: e.target.value })
                    }
                    className="form-input mt-1"
                    placeholder={t("urlPlaceholder")}
                    required
                  />
                </div>
              )}

              {/* Content (for TEXT type) */}
              {resourceForm.type === "TEXT" && (
                <div>
                  <label htmlFor="resourceContent" className="form-label">
                    {t("contentLabel")}
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
                  value={resourceForm.duration}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      duration: e.target.value,
                    })
                  }
                  className="form-input mt-1"
                  placeholder={t("durationPlaceholder")}
                  min="1"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {editingResource && (
                  <button
                    type="button"
                    onClick={handleDeleteResourceFromModal}
                    className="btn-danger btn-md"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    {t("deleteButton")}
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={closeResourceModal}
                  className="btn-ghost btn-md"
                >
                  {t("cancelButton")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-md"
                >
                  {submitting ? t("savingButton") : editingResource ? t("saveButton") : t("createResourceButton")}
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
        title={t("deleteResourceTitle")}
        message={t("deleteResourceMessage", { title: deleteModal.title })}
        confirmText={t("confirmDeleteButton")}
        variant="danger"
      />
    </PageContainer>
  );
}
