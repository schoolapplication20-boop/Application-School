/**
 * India-locale date/time helpers.
 *
 * All helpers produce strings in IST (Asia/Kolkata, UTC+05:30) using
 * the en-IN locale so day names, month names, and digit groups match
 * Indian conventions.
 */

const IST = 'Asia/Kolkata';
const LOCALE = 'en-IN';

/**
 * Format a date or datetime string as a readable IST date.
 * e.g. "25 Jan 2025"
 */
export const fmtDate = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(typeof value === 'string' && !value.includes('T') ? value + 'T00:00:00' : value);
    if (isNaN(d)) return String(value);
    return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
  } catch { return String(value); }
};

/**
 * Format a date + time as IST datetime.
 * e.g. "25 Jan 2025, 03:45 PM"
 */
export const fmtDateTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleString(LOCALE, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: IST,
    });
  } catch { return String(value); }
};

/**
 * Format only the time part of a datetime string in IST.
 * e.g. "03:45 PM"
 */
export const fmtTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST });
  } catch { return String(value); }
};

/**
 * Return today's date string in YYYY-MM-DD (IST).
 * Useful as a `max` / `min` attribute on <input type="date">.
 */
export const todayIST = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: IST }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Return "Good Morning / Afternoon / Evening" based on IST hour.
 */
export const greetingIST = () => {
  const h = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: IST });
  const hour = parseInt(h, 10);
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Format an Indian Rupee amount.
 * e.g. fmtINR(12345.6) → "₹12,345.60"
 */
export const fmtINR = (value, decimals = 2) =>
  Number(value || 0).toLocaleString(LOCALE, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
