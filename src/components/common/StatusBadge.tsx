type StatusType = "active" | "idle" | "distracted" | "offline" | "live";

interface StatusBadgeProps {
  status: StatusType;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  active: { label: "ACTIVO", className: "badge-active" },
  idle: { label: "INACTIVO", className: "badge-idle" },
  distracted: { label: "DISTRAÍDO", className: "badge-distracted" },
  offline: { label: "OFFLINE", className: "badge-offline" },
  live: { label: "LIVE", className: "badge-live" },
};

export function StatusBadge({
  status,
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`${config.className} ${className}`}>
      {showDot && (
        <span
          className={`status-dot-${status === "live" ? "distracted" : status}`}
        />
      )}
      {config.label}
    </span>
  );
}
