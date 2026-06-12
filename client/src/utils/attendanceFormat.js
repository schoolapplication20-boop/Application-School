/** Format a YYYY-MM-DD date string as "DD Mon YYYY" (en-IN). */
export const formatAttendanceDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : String(d);
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Threshold-based text color for an attendance percentage (>=90 good, >=75 ok, below low). */
export const pctTextColor = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';

/** Threshold-based background color for an attendance percentage badge. */
export const pctBgColor = (p) => p >= 90 ? '#f0fff4' : p >= 75 ? '#fffaf0' : '#fff5f5';

/** Threshold-based accent color for attendance percentage bars/badges. */
export const pctAccentColor = (p) => p >= 90 ? '#0de1e8' : p >= 75 ? '#ed8936' : '#e53e3e';
