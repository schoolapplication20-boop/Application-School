/** Shared category list for message/broadcast composer dropdowns. */
export const MESSAGE_CATEGORIES = ['GENERAL', 'ACADEMIC', 'ANNOUNCEMENT', 'EXAM', 'FEE', 'URGENT'];

/** Color scheme for a message category badge. */
export const categoryColor = (cat) => {
  switch (cat) {
    case 'URGENT':       return { bg: '#fff5f5', color: '#c53030', border: '#feb2b2' };
    case 'EXAM':         return { bg: '#faf5ff', color: '#6b46c1', border: '#d6bcfa' };
    case 'FEE':          return { bg: '#fffaf0', color: '#c05621', border: '#fbd38d' };
    case 'ACADEMIC':     return { bg: '#f0fff4', color: '#276749', border: '#9ae6b4' };
    case 'ANNOUNCEMENT': return { bg: '#ebf8ff', color: '#2b6cb0', border: '#bee3f8' };
    default:             return { bg: '#f7fafc', color: '#4a5568', border: '#e2e8f0' };
  }
};

// Backend stores LocalDateTime without timezone (UTC). Append 'Z' so the
// browser converts it to local time instead of treating it as already local.
const toUtcDate = (dt) => {
  if (!dt) return null;
  const utc = typeof dt === 'string' && !dt.endsWith('Z') && !dt.includes('+') ? dt + 'Z' : dt;
  return new Date(utc);
};

/** Format a message timestamp as an absolute date + time string. */
export const formatMessageDateTime = (dt) => {
  const d = toUtcDate(dt);
  if (!d) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** Format a message timestamp relative to now ("just now", "5m ago", …), falling back to a date. */
export const formatRelativeTime = (dt) => {
  const d = toUtcDate(dt);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
