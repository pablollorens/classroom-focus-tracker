"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFocusTracking } from "@/hooks/useFocusTracking";

interface SessionData {
    sessionId: string;
    lessonTitle: string;
    studentName: string;
}

interface Resource {
    id: string;
    title: string;
    type: string; // VIDEO, PDF, URL, TEXT
    url: string | null;
    content: string | null;
    duration: number | null;
}

interface Exercise {
    id: string;
    orderIndex: number;
    resource: Resource | null;
}

interface SessionContent {
    session: {
        id: string;
        startedAt: string;
        teacher: {
            email: string;
        };
    };
    lesson: {
        title: string;
        exercises: Exercise[];
    };
}

export default function StudentSessionPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"LOADING" | "ACTIVE" | "ERROR">("LOADING");
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [content, setContent] = useState<SessionContent | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [handRaised, setHandRaised] = useState(false);
    const [tick, setTick] = useState(0);

    // Activate tracking when we have a session ID
    const focusStatus = useFocusTracking(sessionData?.sessionId || null);

    // Timer tick every second
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

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

    // Fetch session content
    useEffect(() => {
        if (status !== "ACTIVE" || !sessionData) return;

        const fetchContent = async () => {
            try {
                const res = await fetch("/api/student/session/content");
                if (res.ok) {
                    const data = await res.json();
                    setContent(data);
                    // Select first exercise by default if exists
                    if (data.lesson.exercises.length > 0) {
                        setSelectedExercise(data.lesson.exercises[0]);
                    }
                } else if (res.status === 410) {
                    // Session ended
                    localStorage.removeItem("studentSession");
                    router.push("/");
                }
            } catch (err) {
                console.error("Failed to fetch content:", err);
            }
        };

        fetchContent();
    }, [status, sessionData, router]);

    // Session timer calculation
    const sessionDuration = useMemo(() => {
        if (!content?.session.startedAt) return "00:00";
        const start = new Date(content.session.startedAt).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, [content?.session.startedAt, tick]);

    // Teacher name from email
    const teacherName = useMemo(() => {
        if (!content?.session.teacher.email) return "";
        const email = content.session.teacher.email;
        const name = email.split("@")[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
    }, [content?.session.teacher.email]);

    // Hand raise handler
    const handleToggleHand = async () => {
        const newState = !handRaised;
        setHandRaised(newState);
        try {
            await fetch("/api/student/session/hand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raised: newState })
            });
        } catch (err) {
            console.error("Failed to toggle hand:", err);
            setHandRaised(!newState); // Revert on error
        }
    };

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
            <div className="h-screen flex flex-col bg-[#101922] font-[Manrope] text-white">
                {/* Header */}
                <header className="bg-[#111418] border-b border-[#283039] shrink-0">
                    <div className="max-w-full mx-auto py-3 px-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="size-10 flex items-center justify-center bg-gradient-to-br from-[#137fec] to-blue-600 rounded-xl text-white">
                                <span className="material-symbols-outlined text-[24px]">school</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">{sessionData.lessonTitle}</h1>
                                <p className="text-sm text-[#9dabb9]">{sessionData.studentName}</p>
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
                                        <span className="text-sm text-red-400 font-medium">Distraido</span>
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

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - Resources List */}
                    <aside className="w-72 bg-[#111418] border-r border-[#283039] flex flex-col shrink-0">
                        <div className="p-4 border-b border-[#283039]">
                            <h2 className="text-sm font-semibold text-[#9dabb9] uppercase tracking-wider">
                                Recursos ({content?.lesson.exercises.filter(e => e.resource).length || 0})
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {content?.lesson.exercises.map((exercise) => {
                                if (!exercise.resource) return null;
                                const isSelected = selectedExercise?.id === exercise.id;
                                const resource = exercise.resource;

                                const typeIcons: Record<string, string> = {
                                    VIDEO: "play_circle",
                                    PDF: "picture_as_pdf",
                                    URL: "link",
                                    TEXT: "article"
                                };

                                return (
                                    <button
                                        key={exercise.id}
                                        onClick={() => setSelectedExercise(exercise)}
                                        className={`w-full text-left p-4 border-l-4 transition-colors ${
                                            isSelected
                                                ? "border-l-[#137fec] bg-[#1c252e]"
                                                : "border-l-transparent hover:bg-[#1c252e]/50"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className={`material-symbols-outlined text-xl ${isSelected ? "text-[#137fec]" : "text-[#9dabb9]"}`}>
                                                {typeIcons[resource.type] || "description"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium truncate ${isSelected ? "text-white" : "text-[#9dabb9]"}`}>
                                                    {resource.title}
                                                </p>
                                                {resource.duration && (
                                                    <p className="text-xs text-[#6b7280] mt-1">
                                                        {resource.duration} min
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Content Viewer */}
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {selectedExercise?.resource ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Resource Title */}
                                <div className="p-4 border-b border-[#283039] bg-[#1c252e] shrink-0">
                                    <h2 className="text-lg font-semibold">{selectedExercise.resource.title}</h2>
                                </div>

                                {/* Resource Content */}
                                <div className="flex-1 overflow-auto p-4">
                                    {selectedExercise.resource.type === "VIDEO" && selectedExercise.resource.url && (
                                        <div className="aspect-video w-full max-w-4xl mx-auto">
                                            <iframe
                                                src={selectedExercise.resource.url.replace("watch?v=", "embed/")}
                                                className="w-full h-full rounded-lg"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    )}
                                    {selectedExercise.resource.type === "PDF" && selectedExercise.resource.url && (
                                        <div className="flex flex-col items-center gap-4">
                                            <iframe
                                                src={selectedExercise.resource.url}
                                                className="w-full max-w-4xl h-[70vh] rounded-lg border border-[#283039]"
                                            />
                                            <a
                                                href={selectedExercise.resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-[#1171d4] rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">open_in_new</span>
                                                Abrir en nueva pestaña
                                            </a>
                                        </div>
                                    )}
                                    {selectedExercise.resource.type === "URL" && selectedExercise.resource.url && (
                                        <div className="flex flex-col items-center gap-4">
                                            <iframe
                                                src={selectedExercise.resource.url}
                                                className="w-full max-w-5xl h-[70vh] rounded-lg border border-[#283039]"
                                            />
                                            <a
                                                href={selectedExercise.resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-[#1171d4] rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">open_in_new</span>
                                                Abrir en nueva pestaña
                                            </a>
                                        </div>
                                    )}
                                    {selectedExercise.resource.type === "TEXT" && selectedExercise.resource.content && (
                                        <div className="max-w-3xl mx-auto prose prose-invert">
                                            <div className="bg-[#1c252e] rounded-xl p-6 border border-[#283039] whitespace-pre-wrap">
                                                {selectedExercise.resource.content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-6xl text-[#137fec] mb-4">auto_stories</span>
                                    <h2 className="text-xl font-bold mb-2">Selecciona un recurso</h2>
                                    <p className="text-[#9dabb9]">Elige un recurso de la lista para comenzar</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>

                {/* Bottom Panel - Session Info */}
                <footer className="bg-[#111418] border-t border-[#283039] shrink-0">
                    <div className="max-w-full mx-auto py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {/* Timer */}
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#9dabb9]">timer</span>
                                <span className="font-mono font-semibold">{sessionDuration}</span>
                                <span className="text-sm text-[#9dabb9]">en sesión</span>
                            </div>

                            {/* Teacher */}
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#9dabb9]">person</span>
                                <span className="text-sm">Prof. {teacherName}</span>
                            </div>
                        </div>

                        {/* Raise Hand Button */}
                        <button
                            onClick={handleToggleHand}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                handRaised
                                    ? "bg-yellow-500 text-black hover:bg-yellow-400"
                                    : "bg-[#1c252e] border border-[#283039] text-[#9dabb9] hover:text-white hover:border-[#137fec]"
                            }`}
                        >
                            <span className="material-symbols-outlined text-xl">
                                {handRaised ? "front_hand" : "back_hand"}
                            </span>
                            {handRaised ? "Bajar mano" : "Levantar mano"}
                        </button>
                    </div>
                </footer>

                {/* Distraction Alert Overlay */}
                {(focusStatus === "DISTRACTED" || focusStatus === "IDLE") && (
                    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border ${
                        focusStatus === "DISTRACTED"
                            ? "bg-red-500/20 border-red-500/30 text-red-400"
                            : "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined">
                                {focusStatus === "DISTRACTED" ? "warning" : "schedule"}
                            </span>
                            <p className="text-sm font-medium">
                                {focusStatus === "DISTRACTED"
                                    ? "Parece que estás distraído. Vuelve a la lección."
                                    : "Has estado inactivo por un momento."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
