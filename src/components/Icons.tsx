type IconProps = { className?: string };

/** Thin `arrow-right` brand glyph, recolored via currentColor. */
export function ArrowRight({ className = 'h-3.5 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 180 136" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={1.75} vectorEffect="non-scaling-stroke">
        <path d="M0 67.4961H179.77" vectorEffect="non-scaling-stroke" />
        <path d="M179.769 67.4969C142.349 67.4969 90.9693 37.3669 90.2793 0.046875" vectorEffect="non-scaling-stroke" />
        <path d="M179.769 67.4961C142.319 67.4961 90.8893 97.6661 90.2793 135.026" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

export function PlayIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

export function VolumeIcon({ muted, className = 'h-4 w-4' }: IconProps & { muted: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      {muted ? (
        <path d="M10.5 6l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M10.5 5.5a3.5 3.5 0 010 5M12.5 3.5a6.5 6.5 0 010 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
