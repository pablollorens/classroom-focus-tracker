"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        }
    }[];
}

export default function GroupDetailsPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const router = useRouter();
    const [group, setGroup] = useState<Group | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isAddingString, setIsAddingStudent] = useState(false);
    const [rawText, setRawText] = useState("");
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Toast State
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Session State
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [selectedLessonId, setSelectedLessonId] = useState("");
    const [lessons, setLessons] = useState<{ id: string, title: string }[]>([]);
    const [isStarting, setIsStarting] = useState(false);

    // Fetch lessons when opening modal
    useEffect(() => {
        if (isStartingSession) {
            fetch("/api/lessons")
                .then(res => res.json())
                .then(data => setLessons(data))
                .catch(err => console.error(err));
        }
    }, [isStartingSession]);

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
                alert("Failed to start session");
            }
        } catch (err) {
            console.error(err);
            alert("Error starting session");
        } finally {
            setIsStarting(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm(`Are you sure you want to delete "${group?.name}" and ALL its students? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/groups/${groupId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.push("/dashboard");
            } else {
                alert("Failed to delete group");
            }
        } catch (err) {
            alert("Error deleting group");
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        // Optimistic update
        const previousStudents = [...students];
        setStudents(students.filter(s => s.id !== studentId));

        try {
            const res = await fetch(`/api/groups/${groupId}/students/${studentId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setToastMessage("Student removed");
                setShowToast(true);
            } else {
                // Revert on failure
                setStudents(previousStudents);
                alert("Failed to delete student");
            }
        } catch (err) {
            setStudents(previousStudents);
            alert("Error deleting student");
        }
    };

    useEffect(() => {
        fetchData();
    }, [groupId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch group details
            const groupRes = await fetch(`/api/groups/${groupId}`);
            if (!groupRes.ok) {
                if (groupRes.status === 404) router.push("/dashboard");
                return;
            }
            const groupData = await groupRes.json();
            setGroup(groupData);

            // Fetch students
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

    const generateUsername = (firstName: string, lastName: string, groupName: string) => {
        // User requested: firstname.lastname (unique within group)
        // We sanitize: lowercase, replace spaces/special chars with empty string or relevant replacement
        const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
        const f = sanitize(firstName);
        const l = sanitize(lastName);
        return `${f}.${l}`;
    };

    const handleBulkAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!group) return;
        setIsProcessing(true);
        setError("");

        const lines = rawText.split('\n').filter(line => line.trim() !== '');
        let successCount = 0;
        let dupCount = 0;
        let errorCount = 0;

        for (const line of lines) {
            const parts = line.trim().split(' ');
            if (parts.length < 1) continue;

            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ') || 'Student'; // Fallback if no last name
            const username = generateUsername(firstName, lastName, group.name);

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
            } catch (err) {
                console.error("Failed to add", line);
                errorCount++;
            }
        }

        setRawText("");
        setIsProcessing(false);
        setIsAddingStudent(false);
        fetchData();

        // Show summary
        if (successCount > 0 || dupCount > 0 || errorCount > 0) {
            setToastMessage(`Added: ${successCount}, Skipped: ${dupCount}, Errors: ${errorCount}`);
            setShowToast(true);
        }
    };


    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!group) return null;

    // Helper to get active session
    const activeSession = group?.sessions?.[0];

    return (
        <div className="space-y-6">
            {/* Top Banner for Active Session */}
            {activeSession && (
                <div className="bg-green-600 px-4 py-3 rounded-md shadow-md flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <span className="font-medium">Session Active: {activeSession.preparedLesson.title}</span>
                    </div>
                    <button
                        onClick={() => router.push(`/dashboard/sessions/${activeSession.id}`)}
                        className="text-sm font-semibold bg-white text-green-700 px-3 py-1 rounded hover:bg-green-50"
                    >
                        Go to Monitor &rarr;
                    </button>
                </div>
            )}

            {/* Navigation Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white">Dashboard</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-medium">{group.name}</span>
            </div>

            <header className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {group.name}
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingStudent(true)}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        Add Students
                    </button>

                    {!activeSession && (
                        <button
                            onClick={() => setIsStartingSession(true)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                        >
                            Start Session
                        </button>
                    )}

                    <button
                        onClick={handleDeleteGroup}
                        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                    >
                        Delete Group
                    </button>
                </div>
            </header>

            {/* Start Session Modal (Simple Inline) */}
            {isStartingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Start New Session</h2>
                        <form onSubmit={handleStartSession}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Select Prepared Lesson
                                </label>
                                <select
                                    value={selectedLessonId}
                                    onChange={(e) => setSelectedLessonId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                                    required
                                >
                                    <option value="">-- Choose a Lesson --</option>
                                    {lessons.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-500">
                                    Don't see your lesson? <Link href="/dashboard/lessons" className="text-indigo-500 hover:underline">Create one here</Link>.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsStartingSession(false)}
                                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isStarting || !selectedLessonId}
                                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                                >
                                    {isStarting ? "Starting..." : "Begin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingString && (
                <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <form onSubmit={handleBulkAdd} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Paste Student List (One per line: Name Surname)
                            </label>
                            <textarea
                                rows={5}
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 font-mono"
                                placeholder={"John Doe\nAlice Smith\nBob Jones"}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddingStudent(false)}
                                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                            >
                                {isProcessing ? "Adding..." : "Add Students"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <main>
                <div className="overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-md border border-gray-200 dark:border-gray-700">
                    <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                        {students.length === 0 ? (
                            <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                No students in this group yet.
                            </li>
                        ) : (
                            students.map((student) => (
                                <li
                                    key={student.id}
                                    className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/dashboard/groups/${groupId}/students/${student.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                                                {student.firstName} {student.lastName}
                                            </p>
                                            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                Username: {student.username}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent navigation
                                                handleDeleteStudent(student.id);
                                            }}
                                            className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </main>
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
}
