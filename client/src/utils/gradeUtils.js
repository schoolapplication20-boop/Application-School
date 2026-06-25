// Shared grade scale utility — single source of truth for grade computation

export const DEFAULT_GRADE_SCALE = [
  { grade: 'O',  minPercentage: 90 },
  { grade: 'A+', minPercentage: 80 },
  { grade: 'A',  minPercentage: 70 },
  { grade: 'B+', minPercentage: 60 },
  { grade: 'B',  minPercentage: 50 },
  { grade: 'B-', minPercentage: 40 },
  { grade: 'C',  minPercentage: 33 },
  { grade: 'F',  minPercentage: 0  },
];

/**
 * Compute grade from marks, maxMarks, and an optional school grade scale.
 * @param {number} marks
 * @param {number} maxMarks
 * @param {Array}  scale  - array of {grade, minPercentage}, descending order
 * @returns {string} grade letter
 */
export function computeGrade(marks, maxMarks, scale = DEFAULT_GRADE_SCALE) {
  if (!maxMarks || maxMarks === 0) return 'N/A';
  const pct = (marks / maxMarks) * 100;
  for (const entry of scale) {
    if (pct >= entry.minPercentage) return entry.grade;
  }
  return 'F';
}

/**
 * Get colour class / style for a grade letter.
 */
export function gradeColor(grade) {
  const map = {
    O: '#22c55e', 'A+': '#16a34a', A: '#4ade80',
    'B+': '#3b82f6', B: '#60a5fa', 'B-': '#f59e0b',
    C: '#f97316', F: '#ef4444',
  };
  return map[grade] || '#6b7280';
}
