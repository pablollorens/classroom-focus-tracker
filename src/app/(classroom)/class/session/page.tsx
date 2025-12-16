"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

interface SessionData {
    sessionId: string;
    lessonTitle: string;
}

import { useFocusTracking } from "@/hooks/useFocusTracking";

export default function StudentSessionPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"LOADING" | "JOINING" | "ACTIVE">("LOADING");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [sessionData, setSessionData] = useState<SessionData | null>(null);

    // Activate tracking when we have a session ID
    const focusStatus = useFocusTracking(sessionData?.sessionId || null);

    // Initial check - maybe student is already in a session? 
    // For this MVP, we'll force join every time they land here to verify password,
    // OR we could store sessionId in localStorage/sessionStorage.
    // Let's start with forced Join for security as requested.
    useEffect(() => {
        setStatus("JOINING");
    }, []);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/student/session/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                const data = await res.json();
                setSessionData(data);
                setStatus("ACTIVE");
            } else {
                const msg = await res.text();
                setError(msg || "Failed to join");
            }
        } catch (err) {
            setError("Connection error");
        }
    };

    if (status === "LOADING") {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">Loading...</div>;
    }

    if (status === "JOINING") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                            Join Class Session
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Enter the password on the board to start.
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleJoin}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="text"
                                    autoComplete="off"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none rounded-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg text-center tracking-widest uppercase font-mono"
                                    placeholder="PASSWORD"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Enter Session
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (status === "ACTIVE" && sessionData) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
                {/* Top Bar */}
                <header className="bg-white dark:bg-gray-800 shadow">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {sessionData.lessonTitle}
                        </h1>
                        <div className="flex items-center gap-2">
                            {focusStatus === "ACTIVE" && (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">Focus Mode On</span>
                                </>
                            )}
                            {focusStatus === "IDLE" && (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                    </span>
                                    <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Idle</span>
                                </>
                            )}
                            {focusStatus === "DISTRACTED" && (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">Distracted!</span>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    {(focusStatus === "DISTRACTED" || focusStatus === "IDLE") && (
                        <div className={`mb-6 p-4 rounded-md ${focusStatus === "DISTRACTED" ? "bg-red-50 border-l-4 border-red-400" : "bg-yellow-50 border-l-4 border-yellow-400"}`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    {/* Icon */}
                                </div>
                                <div className="ml-3">
                                    <p className={`text-sm ${focusStatus === "DISTRACTED" ? "text-red-700" : "text-yellow-700"}`}>
                                        {focusStatus === "DISTRACTED"
                                            ? "You are currently distracted. Please return to the lesson."
                                            : "You have been idle for a while. Are you still there?"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="px-4 py-6 sm:px-0">
                        <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg h-96 flex items-center justify-center text-gray-500">
                            Create a component to fetch and list exercises here.
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}
