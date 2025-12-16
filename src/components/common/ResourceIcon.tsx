type ResourceType = "VIDEO" | "PDF" | "URL" | "TEXT";

interface ResourceIconProps {
  type: ResourceType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconConfig: Record<ResourceType, { icon: string; color: string }> = {
  VIDEO: { icon: "smart_display", color: "text-red-400" },
  PDF: { icon: "picture_as_pdf", color: "text-purple-400" },
  URL: { icon: "link", color: "text-blue-400" },
  TEXT: { icon: "article", color: "text-gray-400" },
};

const sizeClasses = {
  sm: "text-[16px]",
  md: "text-[20px]",
  lg: "text-[24px]",
};

export function ResourceIcon({
  type,
  size = "md",
  className = "",
}: ResourceIconProps) {
  const config = iconConfig[type];

  return (
    <span
      className={`material-symbols-outlined ${config.color} ${sizeClasses[size]} ${className}`}
    >
      {config.icon}
    </span>
  );
}
