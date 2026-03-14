// ─── Date helpers ─────────────────────────────────────────────────────────────

export const MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export { formatDate, fmtW, fmtTime, dayLabel, fmtWorkoutType, fmtVol, formatMonthLabel } from './utils/format';

// ─── Design tokens (re-export from single source) ─────────────────────────────
export {
  CARD_BTN_STYLE,
  PRIMARY_CARD_STYLE,
  DARK_CARD_STYLE,
  SECONDARY_CARD_STYLE,
  PAGE_HEADING_STYLE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_MUTED,
  TEXT_FADED,
  ACCENT_COLOR,
} from './design-tokens';
