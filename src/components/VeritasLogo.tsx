interface VeritasLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
}

/**
 * Original VERITAS AI logo:
 * Interlaced letters with V as base, E as 3 horizontal strokes (≡),
 * clean squared ends with no sharp protruding corners.
 */
export function VeritasLogo({
  size = 44,
  className = '',
  showWordmark = false,
  subtitle = 'Authenticity Verification',
}: VeritasLogoProps) {
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Original VERITAS AI Logo"
      >
        <polygon
          points="20,22 33,22 60,92 87,22 100,22 66,106 54,106"
          fill="currentColor"
        />
        <rect x="36" y="34" width="10" height="60" fill="currentColor" />
        <rect x="14" y="34" width="38" height="8" fill="currentColor" />
        <rect x="14" y="48" width="38" height="8" fill="currentColor" />
        <rect x="14" y="62" width="38" height="8" fill="currentColor" />
        <path
          d="M52 14 H73 C84 14 91 20 91 29 C91 37 85 43 76 44 L91 63 H78 L65 45 H61 V63 H52 V14 Z M61 22 V37 H72 C78 37 81 34 81 29 C81 25 78 22 72 22 H61 Z"
          fill="currentColor"
        />
        <path
          d="M97 57 C97 49 90 45 80 45 C70 45 64 50 64 57 C64 64 70 67 79 69 C87 71 90 73 90 78 C90 83 85 86 78 86 C71 86 67 83 66 78 L57 80 C59 89 67 94 78 94 C90 94 99 88 99 78 C99 69 92 65 82 62 C75 60 73 59 73 56 C73 53 76 52 80 52 C85 52 88 54 89 58 L97 57 Z"
          fill="currentColor"
        />
      </svg>

      {showWordmark && (
        <div className="mt-2 flex flex-col items-center">
          <div className="flex items-center gap-1.5 font-display text-xl font-extrabold tracking-[0.18em] text-current">
            <span>V</span>
            <svg
              width="16"
              height="15"
              viewBox="0 0 18 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect x="0" y="1" width="18" height="3" fill="currentColor" />
              <rect x="0" y="6.5" width="18" height="3" fill="currentColor" />
              <rect x="0" y="12" width="18" height="3" fill="currentColor" />
            </svg>
            <span>RITAS AI</span>
          </div>
          <span className="mt-0.5 text-[11px] font-semibold tracking-[0.16em] uppercase opacity-80">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
