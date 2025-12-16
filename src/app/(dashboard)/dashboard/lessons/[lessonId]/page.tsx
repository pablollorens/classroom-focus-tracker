"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Toast } from "@/components/Toast";

interface Exercise {
    id: string;
    title: string;
    url: string;
    orderIndex: number;
}

interface Lesson {
    id: string;
    title: string;
    exercises: Exercise[];
}

export default function LessonEditorPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = use(params);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);

    // Form State
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Toast
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        fetchLesson();
    }, [lessonId]);

    const fetchLesson = async () => {
        try {
            const res = await fetch(`/api/lessons/${lessonId}`);
            if (res.ok) {
                const data = await res.json();
                setLesson(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExercise = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/lessons/${lessonId}/exercises`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, url }),
            });

            if (res.ok) {
                const newExercise = await res.json();
                setLesson(prev => prev ? { ...prev, exercises: [...prev.exercises, newExercise] } : null);
                setTitle("");
                setUrl("");
                setIsAdding(false);
                setToastMessage("Exercise added");
                setShowToast(true);
            } else {
                alert("Failed to add exercise");
            }
        } catch (error) {
            alert("Error adding exercise");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!lesson) return <div className="p-8 text-center">Lesson not found.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/lessons" className="hover:text-gray-900 dark:hover:text-white">Lessons</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white font-medium">{lesson.title}</span>
            </div>

            <header className="flex items-center justify-between border-b pb-4 dark:border-gray-700">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {lesson.title}
                </h1>
                <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    Add Exercise Link
                </button>
            </header>

            {/* Configured Exercises List */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg border border-gray-200 dark:border-gray-700">
                <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                    {lesson.exercises.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No exercises added yet. Add links for students to focus on.
                        </li>
                    ) : (
                        lesson.exercises.map((exercise, index) => (
                            <li key={exercise.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {index + 1}. {exercise.title}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                        <a href={exercise.url} target="_blank" rel="noreferrer" className="hover:underline text-indigo-500">
                                            {exercise.url}
                                        </a>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Future: Edit/Delete/Reorder */}
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Add Exercise Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Add Exercise Link</h2>
                        <form onSubmit={handleAddExercise}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                                    placeholder="e.g. Wiki Article"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    URL
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                                    placeholder="https://"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    );
}
