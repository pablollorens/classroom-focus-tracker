"use client";

import { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: "success" | "error";
}

export function Toast({ message, isVisible, onClose, type = "success" }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`fixed top-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${type === "error" ? "bg-red-500 text-white" : "bg-green-600 text-white"
            }`}>
            <div className="flex items-center space-x-2">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
                    &times;
                </button>
            </div>
        </div>
    );
}
