"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout";
import { StatusBadge, EmptyState } from "@/components/common";
import { LiveSessionIllustration } from "@/components/illustrations";

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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const ts = useTranslations("sidebar");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        setNewGroupName("");
        setIsCreating(false);
        fetchGroups();
      }
    } catch (error) {
      console.error("Failed to create group", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Separate active sessions and groups
  const activeGroups = groups.filter(
    (g) => g.sessions && g.sessions.length > 0
  );
  const inactiveGroups = groups.filter(
    (g) => !g.sessions || g.sessions.length === 0
  );

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
      {/* Welcome Section */}
      <section>
        <h1 className="text-heading-xl mb-2">
          {t("welcome", { name: session?.user?.email?.split("@")[0] ?? "" })}
        </h1>
        <p className="text-body">
          {t("subtitle")}
        </p>
      </section>

      {/* Active Sessions */}
      {activeGroups.length > 0 && (
        <section>
          <div className="flex-between mb-4">
            <h2 className="text-heading text-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 filled">
                sensors
              </span>
              {t("liveNow")}
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeGroups.map((group) => {
              const activeSession = group.sessions![0];
              return (
                <Link
                  key={group.id}
                  href={`/dashboard/sessions/${activeSession.id}`}
                  className="card-session group"
                >
                  <div className="card-session-image bg-gradient-to-br from-[var(--color-primary)] to-blue-600">
                    <div className="absolute inset-0 flex-center">
                      <LiveSessionIllustration className="w-full h-full p-4" />
                    </div>
                    <div className="absolute top-3 left-3">
                      <StatusBadge status="live" />
                    </div>
                  </div>
                  <div className="card-session-content">
                    <div>
                      <h3 className="text-heading text-lg mb-1">
                        {group.name}
                      </h3>
                      <p className="text-body text-sm">
                        {activeSession.preparedLesson.title}
                      </p>
                    </div>
                    <div className="flex-between mt-4">
                      <span className="text-caption">
                        {t("students", { count: group._count.students })}
                      </span>
                      <span className="btn-primary btn-sm">
                        {t("viewSession")}
                        <span className="material-symbols-outlined text-lg">
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* My Classes */}
      <section>
        <div className="flex-between mb-4">
          <h2 className="text-heading text-xl">{t("myClasses")}</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary btn-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            {t("newGroup")}
          </button>
        </div>

        {/* Create Group Form */}
        {isCreating && (
          <div className="surface-card p-4 mb-4">
            <form onSubmit={handleCreateGroup} className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="name" className="form-label">
                  {t("groupName")}
                </label>
                <input
                  type="text"
                  id="name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="form-input mt-1"
                  placeholder={t("groupNamePlaceholder")}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
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
                  {submitting ? tc("saving") : tc("save")}
                </button>
              </div>
            </form>
          </div>
        )}

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
            {inactiveGroups.map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/groups/${group.id}`}
                className="card-group"
              >
                <div className="card-group-image bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-darker)]">
                  <div className="absolute inset-0 flex-center">
                    <span className="material-symbols-outlined text-[var(--text-muted)] text-4xl">
                      school
                    </span>
                  </div>
                </div>
                <div className="flex-stack gap-1">
                  <h3 className="text-heading text-base">{group.name}</h3>
                  <p className="text-caption">
                    {t("students", { count: group._count.students })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-heading text-xl mb-4">{t("quickLinks")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/dashboard/lessons" className="surface-card-interactive p-5 flex items-center gap-4">
            <div className="icon-container-lg icon-primary">
              <span className="material-symbols-outlined text-2xl">
                local_library
              </span>
            </div>
            <div>
              <h3 className="text-heading text-base">{ts("library")}</h3>
              <p className="text-caption">{t("libraryDescription")}</p>
            </div>
          </Link>
          <Link href="/dashboard/calendar" className="surface-card-interactive p-5 flex items-center gap-4">
            <div className="icon-container-lg icon-primary">
              <span className="material-symbols-outlined text-2xl">
                calendar_month
              </span>
            </div>
            <div>
              <h3 className="text-heading text-base">{ts("schedule")}</h3>
              <p className="text-caption">{t("scheduleDescription")}</p>
            </div>
          </Link>
          <Link href="/dashboard/reports" className="surface-card-interactive p-5 flex items-center gap-4 opacity-50 pointer-events-none">
            <div className="icon-container-lg icon-muted">
              <span className="material-symbols-outlined text-2xl">
                bar_chart
              </span>
            </div>
            <div>
              <h3 className="text-heading text-base">{ts("reports")}</h3>
              <p className="text-caption">{t("reportsDescription")}</p>
            </div>
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
