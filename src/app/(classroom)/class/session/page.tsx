"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFocusTracking } from "@/hooks/useFocusTracking";

interface SessionData {
    sessionId: string;
    lessonTitle: string;
    studentName: string;
}

export default function StudentSessionPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"LOADING" | "ACTIVE" | "ERROR">("LOADING");
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [error, setError] = useState("");

    // Activate tracking when we have a session ID
    const focusStatus = useFocusTracking(sessionData?.sessionId || null);

    useEffect(() => {
        // Check localStorage for session data from login
        const stored = localStorage.getItem("studentSession");

        if (!stored) {
            // No session data, redirect to login
            router.push("/");
            return;
        }

        try {
            const data = JSON.parse(stored) as SessionData;
            if (!data.sessionId) {
                throw new Error("Invalid session data");
            }
            setSessionData(data);
            setStatus("ACTIVE");
        } catch {
            // Invalid data, clear and redirect
            localStorage.removeItem("studentSession");
            router.push("/");
        }
    }, [router]);

    const handleLeaveSession = () => {
        localStorage.removeItem("studentSession");
        router.push("/");
    };

    if (status === "LOADING") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#101922]">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-8 border-2 border-[#137fec] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[#9dabb9]">Cargando sesión...</span>
                </div>
            </div>
        );
    }

    if (status === "ACTIVE" && sessionData) {
        return (
            <div className="min-h-screen bg-[#101922] font-[Manrope] text-white">
                {/* Top Bar */}
                <header className="bg-[#111418] border-b border-[#283039]">
                    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="size-10 flex items-center justify-center bg-gradient-to-br from-[#137fec] to-blue-600 rounded-xl text-white">
                                <span className="material-symbols-outlined text-[24px]">
                                    school
                                </span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">
                                    {sessionData.lessonTitle}
                                </h1>
                                <p className="text-sm text-[#9dabb9]">
                                    {sessionData.studentName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Focus Status Indicator */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c252e] border border-[#283039]">
                                {focusStatus === "ACTIVE" && (
                                    <>
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                        </span>
                                        <span className="text-sm text-green-400 font-medium">Enfocado</span>
                                    </>
                                )}
                                {focusStatus === "IDLE" && (
                                    <>
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                                        </span>
                                        <span className="text-sm text-yellow-400 font-medium">Inactivo</span>
                                    </>
                                )}
                                {focusStatus === "DISTRACTED" && (
                                    <>
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                        <span className="text-sm text-red-400 font-medium">Distraído</span>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={handleLeaveSession}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#9dabb9] hover:text-white hover:bg-[#283039] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Salir
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {/* Distraction/Idle Alert */}
                    {(focusStatus === "DISTRACTED" || focusStatus === "IDLE") && (
                        <div className={`mb-6 p-4 rounded-xl border ${
                            focusStatus === "DISTRACTED"
                                ? "bg-red-500/10 border-red-500/20"
                                : "bg-yellow-500/10 border-yellow-500/20"
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined ${
                                    focusStatus === "DISTRACTED" ? "text-red-400" : "text-yellow-400"
                                }`}>
                                    {focusStatus === "DISTRACTED" ? "warning" : "schedule"}
                                </span>
                                <p className={`text-sm ${
                                    focusStatus === "DISTRACTED" ? "text-red-400" : "text-yellow-400"
                                }`}>
                                    {focusStatus === "DISTRACTED"
                                        ? "Parece que estás distraído. Por favor, vuelve a la lección."
                                        : "Has estado inactivo por un momento. ¿Sigues ahí?"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="bg-[#1c252e] border border-[#283039] rounded-2xl p-8">
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <span className="material-symbols-outlined text-5xl text-[#137fec] mb-4">
                                auto_stories
                            </span>
                            <h2 className="text-xl font-bold mb-2">Sesión Activa</h2>
                            <p className="text-[#9dabb9] max-w-md">
                                Mantén esta ventana abierta mientras trabajas en la clase.
                                Tu profesor puede ver tu estado de enfoque en tiempo real.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}
