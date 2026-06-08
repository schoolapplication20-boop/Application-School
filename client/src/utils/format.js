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

const PRE_PRIMARY = ['nursery', 'lkg', 'ukg'];

/**
 * Format a class name with an optional section into a standardised display string.
 *
 * Handles:
 *  - Duplicate prefix:  "Class 1"   → "Class 1"  (not "Class Class 1")
 *  - Numeric raw input: "1"         → "Class 1"
 *  - Pre-primary:       "Nursery"   → "Nursery"   (no "Class" prefix)
 *  - With section:      ("Class 1", "A") → "Class 1-A"
 *  - Combined string:   "1-A"       → "Class 1-A"
 *  - Combined nursery:  "Nursery-A" → "Nursery-A"
 *
 * @param {string} rawClass - Raw class name or combined class-section string
 * @param {string} [section] - Optional section letter (e.g. "A", "B")
 * @returns {string}
 */
export const formatClassName = (rawClass, section = '') => {
  if (!rawClass) return '';
  const str = String(rawClass).trim();

  // If section is embedded (e.g. "1-A", "Class 1-A", "Nursery-A")
  if (!section && str.includes('-')) {
    const stripped = str.replace(/^class\s+/i, '');
    const lastDash = stripped.lastIndexOf('-');
    const classPart = stripped.substring(0, lastDash);
    const secPart   = stripped.substring(lastDash + 1);
    if (secPart.length <= 2 && secPart.length > 0) {
      return formatClassName(classPart, secPart);
    }
  }

  const clean = str.replace(/^class\s+/i, '');
  const base  = PRE_PRIMARY.includes(clean.toLowerCase()) ? clean : `Class ${clean}`;
  return section ? `${base}-${String(section).trim().toUpperCase()}` : base;
};
