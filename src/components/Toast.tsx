"use client";

import { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: "success" | "error";
}

export function Toast({ message, isVisible, onClose, type = "success" }: ToastProps) {
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            // Small delay to trigger enter animation
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });

            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            // Start fade out
            setIsAnimating(false);
            // Wait for animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed top-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg transition-all duration-300 transform ${
                isAnimating
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-2 opacity-0"
            } ${type === "error" ? "bg-red-500 text-white" : "bg-green-600 text-white"}`}
        >
            <div className="flex items-center space-x-2">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
                    &times;
                </button>
            </div>
        </div>
    );
}
