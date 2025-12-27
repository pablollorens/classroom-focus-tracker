interface FlagIconProps {
  locale: "nl" | "es" | "en";
  className?: string;
}

export function FlagIcon({ locale, className = "w-6 h-4" }: FlagIconProps) {
  const flags: Record<string, React.ReactNode> = {
    // Netherlands: Red, White, Blue (horizontal stripes)
    nl: (
      <svg viewBox="0 0 24 16" className={className}>
        <rect width="24" height="5.33" fill="#AE1C28" />
        <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
        <rect y="10.66" width="24" height="5.34" fill="#21468B" />
      </svg>
    ),
    // Spain: Red, Yellow, Red (horizontal stripes)
    es: (
      <svg viewBox="0 0 24 16" className={className}>
        <rect width="24" height="4" fill="#C60B1E" />
        <rect y="4" width="24" height="8" fill="#FFC400" />
        <rect y="12" width="24" height="4" fill="#C60B1E" />
      </svg>
    ),
    // United Kingdom: Union Jack
    en: (
      <svg viewBox="0 0 24 16" className={className}>
        <rect width="24" height="16" fill="#012169" />
        <path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFFFFF" strokeWidth="3" />
        <path d="M0,0 L24,16 M24,0 L0,16" stroke="#C8102E" strokeWidth="1.5" />
        <path d="M12,0 V16 M0,8 H24" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="3" />
      </svg>
    ),
  };

  return (
    <span className="inline-flex items-center rounded-sm overflow-hidden shadow-sm border border-white/10">
      {flags[locale]}
    </span>
  );
}
