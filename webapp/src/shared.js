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
// Rose gold shimmer: pale champagne rose (#F2D0C8) → deep rose gold (#C46A5A)

/** Apply to text via WebkitBackgroundClip */
export const AURA_TEXT = {
  background: 'linear-gradient(135deg, #F2D0C8 0%, #C46A5A 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

/** Progress bar fill: rose gold left → champagne right */
export const AURA_BAR = 'linear-gradient(90deg, #C46A5A 0%, #F2D0C8 100%)';

// ─── Shared styles ────────────────────────────────────────────────────────────

/** Glass card button — main action card style used throughout the app */
export const CARD_BTN_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.065) 0%, rgba(0,0,0,0) 100%) padding-box, linear-gradient(135deg, rgba(242,208,200,0.24) 0%, rgba(196,106,90,0.16) 50%, rgba(242,208,200,0.10) 100%) border-box',
  backgroundColor: 'rgba(0,0,0,0.10)',
  border: '1px solid transparent',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 18px rgba(255,255,255,0.05)',
};

/** Dark glass panel — data cards in exercise and history detail screens */
export const DARK_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%) rgba(0,0,0,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
};
