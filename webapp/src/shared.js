// ─── Date helpers ─────────────────────────────────────────────────────────────

export const MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "03 MAR 2026" from "2026-03-03" */
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day} ${MONTHS_ABBR[parseInt(month) - 1]} ${year}`;
}

/** Trims trailing .0: 60.0 → "60", 62.5 → "62.5" */
export function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

// ─── Aura Gradient ────────────────────────────────────────────────────────────
// Metallic shimmer: cold platinum (#EAEAEA) → deep matte gold (#C5A059)

/** Apply to text via WebkitBackgroundClip */
export const AURA_TEXT = {
  background: 'linear-gradient(135deg, #EAEAEA 0%, #C5A059 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/** Progress bar fill: gold left → platinum right (tempering effect) */
export const AURA_BAR = 'linear-gradient(90deg, #C5A059 0%, #EAEAEA 100%)';

// ─── Shared styles ────────────────────────────────────────────────────────────

/** Glass card button — main action card style used throughout the app */
export const CARD_BTN_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(0,0,0,0) 100%) padding-box, linear-gradient(135deg, rgba(234,234,234,0.26) 0%, rgba(197,160,89,0.18) 50%, rgba(234,234,234,0.12) 100%) border-box',
  backgroundColor: 'rgba(0,0,0,0.10)',
  border: '1px solid transparent',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 18px rgba(255,255,255,0.05)',
};

/** Dark glass panel — data cards in exercise and history detail screens */
export const DARK_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%) rgba(0,0,0,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
};
