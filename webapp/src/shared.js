// ─── Date helpers ─────────────────────────────────────────────────────────────

export const MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export { formatDate, fmtW, fmtTime, dayLabel, fmtWorkoutType, fmtVol } from './utils/format';

// ─── Shared styles ────────────────────────────────────────────────────────────

/** Glass card button — main action card style used throughout the app */
export const CARD_BTN_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%) rgba(0,0,0,0.10)',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06), 0 0 6px rgba(255,255,255,0.04)',
};

/** Dark glass panel — data cards in exercise and history detail screens */
export const DARK_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%) rgba(0,0,0,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
};
