"use client";

import { useTranslations } from "next-intl";

type StatusType = "active" | "idle" | "distracted" | "offline" | "live";

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
  className?: string;
}

const statusClassNames: Record<StatusType, string> = {
  active: "badge-active",
  idle: "badge-idle",
  distracted: "badge-distracted",
  offline: "badge-offline",
  live: "badge-live",
};

export function StatusBadge({
  status,
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const t = useTranslations("statusBadge");
  const badgeClassName = statusClassNames[status];

  return (
    <span className={`${badgeClassName} ${className}`}>
      {showDot && (
        <span
          className={`status-dot-${status === "live" ? "distracted" : status}`}
        />
      )}
      {t(status)}
    </span>
  );
}
