// Prediq brand mark — a "confidence interval": two brackets enclosing a point
// estimate ( • ). It encodes the product (a probability with a prediction at
// its center) and the IQ/intelligence angle, with a single sparing orange
// accent. Brackets use currentColor so the mark inherits its surroundings;
// it reads on its own without the wordmark.

type LogoMarkProps = { size?: number; className?: string; title?: string }

export function LogoMark({ size = 30, className = '', title }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <g fill="none" strokeLinecap="round">
        <path
          className="logo-bracket logo-bracket-l"
          d="M14.36 35.49 A15 15 0 0 1 14.36 12.51"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="logo-bracket logo-bracket-r"
          d="M33.64 12.51 A15 15 0 0 1 33.64 35.49"
          stroke="currentColor"
          strokeWidth="4"
        />
        <circle className="logo-point" cx="24" cy="24" r="3.4" fill="#ff7a00" />
      </g>
    </svg>
  )
}

export function Logo({ className = '', markSize = 30 }: { className?: string; markSize?: number }) {
  return (
    <span className={`logo inline-flex items-center gap-[11px] ${className}`}>
      <LogoMark size={markSize} className="logo-mark text-ink" />
      <span className="logo-word">Prediq</span>
    </span>
  )
}
