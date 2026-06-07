/** Format number as currency string (no symbol) */
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Get initials from a name string */
export const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

/** Map a percentage score to a letter grade */
export const scoreToGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

/** Grade thresholds for color/gradient mapping */
export const GRADE_COLORS = {
  'A+': '#10b981', A: '#3b82f6', B: '#8b5cf6', C: '#f59e0b', D: '#f97316', F: '#ef4444'
};
