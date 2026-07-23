// Maps every common way a grade level gets typed in — "7", "Class 7", "VII" — to its
// numeric grade. Schools free-type class names ("Type any class name exactly as you want
// it stored"), so the same grade can exist as a digit or a Roman numeral across records.
const GRADE_LEVEL = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12,
};

/**
 * Extracts the numeric grade level from a class name in any common format.
 * Returns null for names with no recognizable grade (e.g. Nursery/LKG/UKG, or unknown names).
 */
export const parseGradeLevel = (name) => {
  const n = (name || '').toLowerCase().replace(/^class\s+/, '').trim();
  return Object.prototype.hasOwnProperty.call(GRADE_LEVEL, n) ? GRADE_LEVEL[n] : null;
};

/**
 * Returns a numeric sort key for a class name so that classes sort in natural school
 * order: Nursery → LKG → UKG → I/1/Class 1 → II/2/Class 2 → … → XII/12/Class 12 → others.
 * Deliberately NOT alphabetic — alphabetic order puts "X" before "IX" and "VIII".
 */
export const classOrder = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('nursery')) return -3;
  if (n.includes('lkg'))     return -2;
  if (n.includes('ukg'))     return -1;
  const grade = parseGradeLevel(name);
  return grade == null ? 999 : grade;
};

/**
 * Comparator for class objects that have `name` and optionally `section`.
 * Usage: classList.sort(sortClasses)
 */
export const sortClasses = (a, b) => {
  const diff = classOrder(a.name || a) - classOrder(b.name || b);
  return diff !== 0 ? diff : (a.section || '').localeCompare(b.section || '');
};

/**
 * Comparator for plain class-name strings.
 * Usage: classNames.sort(sortClassNames)
 */
export const sortClassNames = (a, b) => classOrder(a) - classOrder(b);
