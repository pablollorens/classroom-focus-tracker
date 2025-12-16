"use client";

import { useState, useEffect } from "react";

interface DistractionTimerProps {
    startTime: string; // ISO string
    status: string;
}

export function DistractionTimer({ startTime, status }: DistractionTimerProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        // Only run timer if we are in a "tracking" state (Distracted or Idle)
        if (status === "ACTIVE") {
            setElapsed(0);
            return;
        }

        const start = new Date(startTime).getTime();

        const tick = () => {
            const now = new Date().getTime();
            const diff = Math.floor((now - start) / 1000); // Seconds
            setElapsed(diff > 0 ? diff : 0);
        };

        tick(); // Immediate
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [startTime, status]);

    if (status === "ACTIVE") return null;

    // Formatting: MM:SS
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

    return (
        <span className="font-mono font-bold text-lg">
            {formatted}
        </span>
    );
}
