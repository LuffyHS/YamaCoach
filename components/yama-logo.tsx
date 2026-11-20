"use client";

type YamaLogoProps = {
  showWordmark?: boolean;
  roleLabel?: "COACH" | "PLAYER";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const markSize = { sm: 20, md: 28, lg: 40 } as const;

export function YamaLogo({ showWordmark = true, roleLabel = "COACH", size = "md", className = "" }: YamaLogoProps) {
  const ms = markSize[size];
  return (
    <span className={`yama-logo yama-logo-${size} ${className}`}>
      <svg width={ms} height={ms} viewBox="0 0 64 64" aria-hidden="true" className="yama-logo-mark">
        {/* Y - emerald, angular cuts */}
        <path d="M4 6 L14 6 L26 28 L18 28 Z" fill="#10B981" />
        <path d="M40 6 L50 6 L32 28 L24 28 Z" fill="#10B981" />
        <path d="M22 26 L32 26 L32 52 L22 52 Z" fill="#10B981" />
        {/* C - hexagonal chamfered, theme-aware */}
        <path
          d="M44 8 L56 8 L60 12 L60 52 L56 56 L44 56 L44 48 L52 48 L54 46 L54 18 L52 16 L44 16 Z"
          fill="var(--yama-c, #F8FAFC)"
        />
        {/* Radiant 4-point star, top center */}
        <path d="M32 0 L34.5 4.5 L39 7 L34.5 9.5 L32 14 L29.5 9.5 L25 7 L29.5 4.5 Z" fill="#F59E0B" />
        <circle cx="32" cy="7" r="1.6" fill="#F8FAFC" />
      </svg>
      {showWordmark && (
        <span className="yama-wordmark">
          YAMA <span className="yama-slash">/</span> {roleLabel}
        </span>
      )}
    </span>
  );
}
