interface EkthetoLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  subtitle?: string;
}

export function EkthetoLogo({
  size = 44,
  className = '',
  showWordmark = false,
  subtitle = 'Expor o que é falso. Revelar o que é real.',
}: EkthetoLogoProps) {
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <img
        src="/assets/ektheto-logo-light.png"
        alt="Ektheto"
        className="block h-auto dark:hidden"
        style={{ width: size * 1.09, height: size }}
      />
      <img
        src="/assets/ektheto-logo-dark.png"
        alt="Ektheto"
        className="hidden h-auto dark:block"
        style={{ width: size * 1.09, height: size }}
      />

      {showWordmark && (
        <div className="flex flex-col items-center">
          <span className="mt-0.5 text-[11px] font-semibold tracking-[0.16em] uppercase opacity-80">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
