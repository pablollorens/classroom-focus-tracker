"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Lesson {
    id: string;
    title: string;
    createdAt: string;
    _count: {
        exercises: number;
    }
}

export default function LessonsPage() {
    const router = useRouter();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        fetchLessons();
    }, []);

    const fetchLessons = async () => {
        try {
            const res = await fetch("/api/lessons");
            if (res.ok) {
                const data = await res.json();
                setLessons(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/lessons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
            });

            if (res.ok) {
                const newLesson = await res.json();
                setNewTitle("");
                setIsCreating(false);
                // Navigate to the editor for this new lesson
                router.push(`/dashboard/lessons/${newLesson.id}`);
            }
        } catch (error) {
            alert("Failed to create lesson");
        }
    };

    const handleDeleteLesson = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent link click
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this lesson?")) return;

        // Optimistic update
        setLessons(lessons.filter(l => l.id !== id));

        try {
            await fetch(`/api/lessons/${id}`, { method: "DELETE" });
        } catch (error) {
            fetchLessons(); // Revert on error
            alert("Failed to delete");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading lessons...</div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Lesson Library
                </h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Create New Lesson
                </button>
            </header>

            {isCreating && (
                <div className="mb-6 rounded-lg bg-gray-50 p-4 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <form onSubmit={handleCreateLesson} className="flex gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Lesson Title
                            </label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                                placeholder="e.g. Science Chapter 4"
                                required
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            Create & Edit
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-10">
                        No lessons created yet. Start by preparing a lesson.
                    </div>
                ) : (
                    lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            onClick={() => router.push(`/dashboard/lessons/${lesson.id}`)}
                            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600 cursor-pointer"
                        >
                            <div className="min-w-0 flex-1">
                                <span className="absolute inset-0" aria-hidden="true" />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                                <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                                    {lesson._count.exercises} exercises
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDeleteLesson(e, lesson.id)}
                                className="z-10 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
