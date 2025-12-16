interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "active" | "idle" | "distracted" | "offline";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
};

const statusRingClasses = {
  active: "ring-2 ring-[var(--status-active)]",
  idle: "ring-2 ring-[var(--status-idle)]",
  distracted: "ring-2 ring-[var(--status-distracted)] animate-pulse",
  offline: "ring-2 ring-[var(--status-offline)]",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, size = "md", status, className = "" }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`
        flex-center rounded-full bg-[var(--surface-overlay)] text-white font-bold
        ${sizeClasses[size]}
        ${status ? statusRingClasses[status] : ""}
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
