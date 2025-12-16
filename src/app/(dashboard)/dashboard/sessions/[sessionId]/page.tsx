"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DistractionTimer } from "@/components/DistractionTimer";
import { Toast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

interface SessionDetails {
    id: string;
    isActive: boolean;
    password: string;
    preparedLesson: {
        title: string;
    };
    group: {
        name: string;
    };
}

interface AttendanceRecord {
    id: string;
    currentStatus: string;
    lastHeartbeat: string;
    lastStatusChange: string;
    student: {
        id: string;
        firstName: string;
        lastName: string;
        username: string;
    };
}

export default function TeacherSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params);
    const router = useRouter();
    const [session, setSession] = useState<SessionDetails | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [, setTick] = useState(0); // Force re-render to recalculate OFFLINE status

    // Periodic re-render every second for countdown timer
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleCopyPassword = () => {
        if (session) {
            navigator.clipboard.writeText(session.password);
            setShowToast(true);
        }
    };

    useEffect(() => {
        // Initial Fetch of Session Info
        const fetchSession = async () => {
            try {
                const res = await fetch(`/api/sessions/${sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSession(data);
                } else {
                    setSession(null);
                }
            } catch (err) {
                console.error(err);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    // Realtime subscription for Attendance
    useEffect(() => {
        if (!session) return;

        // Initial fetch
        const fetchAttendance = async () => {
            try {
                const res = await fetch(`/api/sessions/${sessionId}/attendance`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setAttendance(data);
                }
            } catch (err) {
                console.error("Fetch error", err);
            }
        };

        fetchAttendance();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`session-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'SessionAttendance',
                    filter: `sessionId=eq.${sessionId}`
                },
                () => {
                    // Refetch when any change happens
                    fetchAttendance();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, session]);

    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to end this session?")) return;
        try {
            await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
            router.push("/dashboard");
        } catch (e) {
            alert("Error ending session");
        }
    };

    const getStatusColor = (status: string, lastHeartbeat: string) => {
        const lastActive = new Date(lastHeartbeat).getTime();
        const now = new Date().getTime();
        const diff = (now - lastActive) / 1000;

        if (diff > 60) return "bg-gray-100 border-gray-300 text-gray-500"; // Offline
        if (status === "DISTRACTED") return "bg-red-50 border-red-200 text-red-700";
        if (status === "IDLE") return "bg-yellow-50 border-yellow-200 text-yellow-700";
        return "bg-green-50 border-green-200 text-green-700";
    };

    const getStatusText = (status: string, lastHeartbeat: string) => {
        const lastActive = new Date(lastHeartbeat).getTime();
        const now = new Date().getTime();
        const diff = (now - lastActive) / 1000;

        if (diff > 60) return "OFFLINE";
        return status;
    };

    const getHeartbeatCountdown = (lastHeartbeat: string) => {
        const lastActive = new Date(lastHeartbeat).getTime();
        const now = new Date().getTime();
        const diff = (now - lastActive) / 1000;
        const remaining = Math.max(0, 60 - diff);
        return Math.floor(remaining);
    };

    if (loading) return <div className="p-8 text-center">Loading session...</div>;
    if (!session) return <div className="p-8 text-center">Session not found.</div>;

    return (
        <div className="space-y-6">
            {/* Header / Control Bar */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                        &larr;
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {session.preparedLesson.title}
                            <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {session.group.name}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            Password: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg">{session.password}</span>
                            <button
                                onClick={handleCopyPassword}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Copy to clipboard"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </p>
                    </div>
                </div>
                <div>
                    <button
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
                        onClick={handleEndSession}
                    >
                        End Session
                    </button>
                </div>
            </div>

            {/* Student Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {attendance.map((record) => {
                    const colorClass = getStatusColor(record.currentStatus, record.lastHeartbeat);
                    const statusText = getStatusText(record.currentStatus, record.lastHeartbeat);
                    const countdown = getHeartbeatCountdown(record.lastHeartbeat);

                    return (
                        <div key={record.id} className={`rounded-lg border-2 p-4 shadow-sm transition-all ${colorClass}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold truncate text-lg">
                                    {record.student.firstName} {record.student.lastName}
                                </h3>
                                {statusText === "ACTIVE" && (
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-80 flex items-center gap-2">
                                {statusText}
                                {(record.currentStatus === "DISTRACTED" || record.currentStatus === "IDLE") && (
                                    <DistractionTimer startTime={record.lastStatusChange} status={record.currentStatus} />
                                )}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs opacity-60">
                                    @{record.student.username}
                                </p>
                                {statusText !== "OFFLINE" && (
                                    <span className={`text-xs font-mono ${countdown <= 3 ? 'text-red-500 font-bold' : 'opacity-50'}`}>
                                        {countdown}s
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {attendance.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p>No students have joined yet.</p>
                    <p className="text-sm">They need to enter password <span className="font-mono font-bold text-gray-600 dark:text-gray-300">{session.password}</span></p>
                </div>
            )}

            <Toast
                message="Password copied to clipboard"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
}
