"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

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

    if (loading) return <div className="p-8 text-center">Loading stats...</div>;
    if (!stats) return <div className="p-8 text-center">Student not found or error loading data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white">Dashboard</Link>
                <span>/</span>
                <Link href={`/dashboard/groups/${groupId}`} className="hover:text-gray-900 dark:hover:text-white">Group</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-medium">{stats.studentName}</span>
            </div>

            <header className="border-b pb-4 dark:border-gray-700">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {stats.studentName}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">@{stats.username}</p>
            </header>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Average Focus Score</dt>
                    <dd className={`mt-1 text-3xl font-semibold tracking-tight ${stats.focusScore >= 70 ? 'text-green-600' : stats.focusScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {stats.focusScore}%
                    </dd>
                </div>

                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Sessions Attended</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        {stats.totalSessions}
                    </dd>
                </div>

                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Distractions</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        {stats.distractions}
                    </dd>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Recent Activity</h3>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700">
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.recentSessions.length === 0 ? (
                            <li className="px-4 py-4 sm:px-6 text-gray-500">No session history yet.</li>
                        ) : (
                            stats.recentSessions.map((session) => (
                                <li key={session.id} className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {session.lessonTitle}
                                        </p>
                                        <div className="ml-2 flex flex-shrink-0 flex-col items-end">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(session.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(session.date).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
