/**
 * Design tokens — single source of truth for UI consistency.
 * Use these in components; avoid hardcoding colors, radii, or card styles.
 *
 * Typography: Bebas Neue only. Hierarchy: заголовки/цифры — крупнее, ярче; подписи/даты — мельче, opacity ниже (Heavy & Light).
 */

// ─── Palette (text) ─────────────────────────────────────────────────────────
/** Tailwind classes for text hierarchy. Use as className. */
export const TEXT_PRIMARY = 'text-white';           // headings, main content
export const TEXT_SECONDARY = 'text-white/80';     // body text
export const TEXT_TERTIARY = 'text-white/55';      // labels, captions
export const TEXT_MUTED = 'text-white/40';         // hints, placeholders
export const TEXT_FADED = 'text-white/30';         // very faint (skip, etc.)

/** Accent for highlights (hex). Used in constants for achievement icons etc. */
export const ACCENT_COLOR = '#C9A96E';

// ─── Spacing (Tailwind scale) ───────────────────────────────────────────────
// Prefer: p-3 (12px), p-4 (16px), p-5 (20px), gap-2 (8px), gap-3 (12px), gap-4 (16px).
// Screen padding: p-5. Card padding: p-4 or p-5. Safe areas: .safe-top, .safe-bottom (index.css).

// ─── Radii ─────────────────────────────────────────────────────────────────
// rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px). Cards: rounded-2xl or rounded-xl.

// ─── Card styles (inline style objects) ──────────────────────────────────────

/** Glass card button — main tappable cards (nav tiles, primary actions). */
export const CARD_BTN_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%) rgba(0,0,0,0.10)',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 0 18px rgba(255,255,255,0.06), 0 0 6px rgba(255,255,255,0.04)',
};

/** Primary CTA card (e.g. "New Workout", "Continue Workout") — slightly brighter. */
export const PRIMARY_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%) rgba(0,0,0,0.10)',
  border: '1px solid rgba(255,255,255,0.20)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30), 0 0 22px rgba(255,255,255,0.09), 0 0 7px rgba(255,255,255,0.05)',
};

/** Dark glass panel — data blocks (exercise sets, history detail). */
export const DARK_CARD_STYLE = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%) rgba(0,0,0,0.65)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)',
};

/** Secondary / add-action card (e.g. "Add Exercise"). */
export const SECONDARY_CARD_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
};

// ─── Typography (inline styles) ────────────────────────────────────────────

/** Page title — list screens (History, Achievements). */
export const PAGE_HEADING_STYLE = { fontSize: '6vw', letterSpacing: '0.1em' };
