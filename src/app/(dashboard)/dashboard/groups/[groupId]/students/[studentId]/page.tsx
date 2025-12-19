"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout";

interface SessionSummary {
    id: string;
    date: string;
    lessonTitle: string;
}

interface StudentStats {
    studentName: string;
    username: string;
    focusScore: number;
    totalSessions: number;
    distractions: number;
    recentSessions: SessionSummary[];
}

export default function StudentStatsPage({ params }: { params: Promise<{ groupId: string, studentId: string }> }) {
    const { groupId, studentId } = use(params);
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`/api/students/${studentId}/stats`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [studentId]);

    if (loading) {
        return (
            <PageContainer>
                <div className="flex-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="size-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-body">Cargando estadísticas...</span>
                    </div>
                </div>
            </PageContainer>
        );
    }

    if (!stats) {
        return (
            <PageContainer>
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-[var(--text-muted)] mb-2">error</span>
                    <p className="text-body">Estudiante no encontrado o error al cargar datos.</p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    Dashboard
                </Link>
                <span className="text-[var(--text-muted)]">/</span>
                <Link href={`/dashboard/groups/${groupId}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    Grupo
                </Link>
                <span className="text-[var(--text-muted)]">/</span>
                <span className="text-[var(--text-primary)] font-medium">{stats.studentName}</span>
            </nav>

            {/* Header */}
            <header>
                <h1 className="text-heading-xl">{stats.studentName}</h1>
                <p className="text-body mt-1">@{stats.username}</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="surface-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="icon-container-md icon-primary">
                            <span className="material-symbols-outlined">speed</span>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${stats.focusScore >= 70 ? 'text-green-400' : stats.focusScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {stats.focusScore}%
                            </p>
                            <p className="text-caption">Promedio de Enfoque</p>
                        </div>
                    </div>
                </div>

                <div className="surface-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="icon-container-md icon-muted">
                            <span className="material-symbols-outlined">event_available</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {stats.totalSessions}
                            </p>
                            <p className="text-caption">Sesiones Asistidas</p>
                        </div>
                    </div>
                </div>

                <div className="surface-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="icon-container-md" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "rgb(239, 68, 68)" }}>
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {stats.distractions}
                            </p>
                            <p className="text-caption">Distracciones Totales</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="surface-card overflow-hidden">
                <div className="p-4 border-b border-[var(--border-default)]">
                    <h3 className="text-heading">Actividad Reciente</h3>
                </div>
                <div>
                    {stats.recentSessions.length === 0 ? (
                        <div className="p-6 text-center">
                            <span className="material-symbols-outlined text-3xl text-[var(--text-muted)] mb-2">history</span>
                            <p className="text-body">Sin historial de sesiones aún.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[var(--border-default)]">
                            {stats.recentSessions.map((session) => (
                                <li key={session.id} className="p-4 hover:bg-[var(--surface-hover)] transition-colors">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-[var(--color-primary)]">
                                            {session.lessonTitle}
                                        </p>
                                        <div className="flex flex-col items-end">
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {new Date(session.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {new Date(session.date).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
