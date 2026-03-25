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

/** Glass card button — main tappable cards (nav tiles, primary actions). Same transparency as History planks. */
export const CARD_BTN_STYLE = {
  background: 'rgba(255,255,255,0.025)',
};

/** Primary CTA card (e.g. "New Workout", "Continue Workout") — slightly brighter. */
export const PRIMARY_CARD_STYLE = {
  background: 'rgba(255,255,255,0.06)',
};

/** Dark glass panel — data blocks (exercise sets, history detail). Same transparency as History planks. */
export const DARK_CARD_STYLE = {
  background: 'rgba(255,255,255,0.025)',
};

/** Secondary / add-action card (e.g. "Add Exercise"). */
export const SECONDARY_CARD_STYLE = {
  background: 'rgba(255,255,255,0.02)',
};

// ─── Typography (inline styles) ────────────────────────────────────────────

/** Page title — list screens (History, Achievements).
 *  Совмещаем с кеглем кнопки NEW WORKOUT на главном:
 *  единый clamp по ширине и без избыточного трекинга.
 */
export const PAGE_HEADING_STYLE = {
  fontSize: 'clamp(14px, 7.5vw, 32px)',
  letterSpacing: 'normal',
};
