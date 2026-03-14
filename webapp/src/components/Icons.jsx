/** Shared icons for consistent use across screens */

/** Cardio = pulse/activity (heartbeat), not love heart */
export function CardioIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12h3l2-4 2 8 2-4 3 2 4-6 2 2"/>
    </svg>
  );
}
