/**
 * Returns a numeric sort key for a class name so that classes sort in
 * natural school order: Nursery → LKG → UKG → Class 1 → 2 → … → 12 → others.
 */
export const classOrder = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('nursery')) return -3;
  if (n.includes('lkg'))     return -2;
  if (n.includes('ukg'))     return -1;
  const num = parseInt(n.replace(/\D/g, ''));
  return isNaN(num) ? 999 : num;
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
