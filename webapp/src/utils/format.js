import { MONTHS_ABBR } from '../shared';

/** "03 MAR 2026" from "2026-03-03" */
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day} ${MONTHS_ABBR[parseInt(month) - 1]} ${year}`;
}

/** Trims trailing .0: 60.0 → "60", 62.5 → "62.5" */
export function fmtW(w) {
  return w === Math.floor(w) ? String(Math.floor(w)) : String(w);
}

/** "1:30" from seconds */
export function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Day label: "DAY_A" → "Day A", "CARDIO" → "Cardio", "CUSTOM_1" → "Custom" */
export function dayLabel(type) {
  if (!type) return 'Workout';
  if (type === 'CARDIO') return 'Cardio';
  if (type.startsWith?.('CUSTOM')) return 'Custom';
  return type.replace('DAY_', 'Day ');
}

/** Workout type label for history: "DAY_A" → "Day A", "CARDIO" → "Cardio" */
export function fmtWorkoutType(type) {
  if (type === 'CARDIO') return 'Cardio';
  return type.replace('DAY_', 'Day ');
}

/** Volume with spaces: 10700 → "10 700 kg" */
export function fmtVol(v) {
  if (!v) return null;
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F') + ' kg';
}
