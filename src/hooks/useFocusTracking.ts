import { useEffect, useRef, useState } from 'react';

export function useFocusTracking(sessionId: string | null) {
    // We differentiate between "Focus State" and "Activity State"
    const [status, setStatus] = useState<"ACTIVE" | "DISTRACTED" | "IDLE">("ACTIVE");
    const statusRef = useRef<"ACTIVE" | "DISTRACTED" | "IDLE">("ACTIVE");
    const lastActivityRef = useRef<number>(Date.now());
    const IDLE_THRESHOLD = 5000; // 5 seconds for testing (was 60s)

    // Sync ref for access inside stale closures if needed, but we mostly rely on event listeners
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        if (!sessionId) return;

        // Function to send status to server
        const sendHeartbeat = (currentStatus: "ACTIVE" | "DISTRACTED" | "IDLE") => {
            fetch("/api/student/session/heartbeat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, status: currentStatus }),
                credentials: "include",  // Ensure auth cookies are sent
            })
            .then(res => {
                if (!res.ok) {
                    console.error("Heartbeat failed:", res.status, res.statusText);
                }
            })
            .catch(err => console.error("Heartbeat network error:", err));
        };

        // Centralized Status Check logic
        const checkStatus = () => {
            const isHidden = document.hidden;
            const hasFocus = document.hasFocus();
            const now = Date.now();
            const timeSinceActivity = now - lastActivityRef.current;

            let newStatus: "ACTIVE" | "DISTRACTED" | "IDLE";

            if (isHidden || !hasFocus) {
                newStatus = "DISTRACTED";
            } else if (timeSinceActivity > IDLE_THRESHOLD) {
                newStatus = "IDLE";
            } else {
                newStatus = "ACTIVE";
            }

            if (statusRef.current !== newStatus) {
                // console.log(`Status changed to: ${newStatus}`);
                statusRef.current = newStatus;
                setStatus(newStatus);
                sendHeartbeat(newStatus);
            }
        };

        // --- Activity Listeners ---
        const handleUserActivity = () => {
            lastActivityRef.current = Date.now();
            // Immediate check if we count this as "waking up"
            if (statusRef.current === "IDLE") {
                checkStatus();
            }
        };

        // Bind events for immediate reaction
        window.addEventListener("mousemove", handleUserActivity);
        window.addEventListener("keydown", handleUserActivity);
        window.addEventListener("click", handleUserActivity);
        window.addEventListener("scroll", handleUserActivity);

        // Bind state events for immediate reaction
        window.addEventListener("focus", checkStatus);
        window.addEventListener("blur", checkStatus);
        document.addEventListener("visibilitychange", checkStatus);

        // --- Sync Loops ---

        // 1. Periodic Check (Backup for missed events & Idle timer)
        const checkInterval = setInterval(checkStatus, 1000);

        // 2. Keep-Alive (30s)
        const heartbeatInterval = setInterval(() => {
            sendHeartbeat(statusRef.current);
        }, 30000);

        // Initial heartbeat
        sendHeartbeat("ACTIVE");

        return () => {
            // Cleanup
            window.removeEventListener("mousemove", handleUserActivity);
            window.removeEventListener("keydown", handleUserActivity);
            window.removeEventListener("click", handleUserActivity);
            window.removeEventListener("scroll", handleUserActivity);
            window.removeEventListener("focus", checkStatus);
            window.removeEventListener("blur", checkStatus);
            document.removeEventListener("visibilitychange", checkStatus);
            clearInterval(checkInterval);
            clearInterval(heartbeatInterval);
        };


    }, [sessionId]);

    return status;
}
