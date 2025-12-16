type StatusType = "active" | "idle" | "distracted" | "offline";

interface StatusDotProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-3",
};

export function StatusDot({
  status,
  size = "md",
  className = "",
}: StatusDotProps) {
  return (
    <span
      className={`status-dot-${status} ${sizeClasses[size]} ${className}`}
    />
  );
}
