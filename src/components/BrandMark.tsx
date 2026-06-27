/** Logo JobPilot — "signal ascendant" : point live + chevrons qui montent. Utilise currentColor. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" aria-hidden="true">
      <circle cx="48" cy="21" r="7" fill="currentColor" />
      <path
        d="M22 60 L48 34 L74 60"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 78 L48 60 L66 78"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}
