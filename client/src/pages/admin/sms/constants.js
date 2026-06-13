// Shared constants/helpers for the SMS & Bulk SMS admin module.

export const TARGET_TYPES = [
  { value: 'SCHOOL',    label: 'Entire School',  icon: 'school',         desc: 'Every active student’s parent in the school' },
  { value: 'CLASS',     label: 'Class',          icon: 'class',          desc: 'All active students in a class (every section)' },
  { value: 'SECTION',   label: 'Class & Section', icon: 'groups',         desc: 'All active students in a specific class and section' },
  { value: 'STUDENTS',  label: 'Specific Students', icon: 'person_search', desc: 'Hand-pick individual students' },
  { value: 'FEE_DUE',   label: 'Fee Due',        icon: 'payments',       desc: 'Students with a pending, overdue, or partial fee' },
  { value: 'ABSENTEES', label: 'Absentees',      icon: 'event_busy',     desc: 'Students marked absent on a given date' },
  { value: 'CUSTOM',    label: 'Custom Numbers', icon: 'dialpad',        desc: 'Send to phone numbers you enter directly' },
];

export const SMS_CATEGORIES = [
  { value: 'FEE_DUE',   label: 'Fee Due' },
  { value: 'ABSENCE',   label: 'Absence' },
  { value: 'EXAM',      label: 'Exam' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'HOLIDAY',   label: 'Holiday' },
  { value: 'MEETING',   label: 'Meeting' },
  { value: 'GENERAL',   label: 'General' },
];

export const CAMPAIGN_STATUS_META = {
  DRAFT:     { label: 'Draft',      color: '#718096', bg: '#edf2f7' },
  SCHEDULED: { label: 'Scheduled',  color: '#c05621', bg: '#fffaf0' },
  PROCESSING:{ label: 'Processing', color: '#2b6cb0', bg: '#ebf8ff' },
  COMPLETED: { label: 'Completed',  color: '#276749', bg: '#f0fff4' },
  CANCELLED: { label: 'Cancelled',  color: '#a0aec0', bg: '#f7fafc' },
};

export const LOG_STATUS_META = {
  SENT:        { label: 'Sent',        color: '#2b6cb0', bg: '#ebf8ff' },
  DELIVERED:   { label: 'Delivered',   color: '#276749', bg: '#f0fff4' },
  FAILED:      { label: 'Failed',      color: '#c53030', bg: '#fff5f5' },
  UNDELIVERED: { label: 'Undelivered', color: '#c05621', bg: '#fffaf0' },
};

export function targetLabel(value) {
  return TARGET_TYPES.find(t => t.value === value)?.label || value;
}

export function categoryLabel(value) {
  return SMS_CATEGORIES.find(c => c.value === value)?.label || value;
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Matches {{variable}} placeholders, same regex as the backend's SmsTemplateService.
const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Auto-filled by the backend: `name` (recipient) and `schoolName` (current school) need no input.
const AUTO_VARIABLES = new Set(['name', 'schoolName']);

/** Returns the unique list of {{placeholder}} names in `content`, excluding auto-filled variables. */
export function extractVariables(content) {
  if (!content) return [];
  const found = new Set();
  let match;
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(content)) !== null) {
    if (!AUTO_VARIABLES.has(match[1])) found.add(match[1]);
  }
  return [...found];
}

/**
 * Estimates SMS segment count. GSM-7 (plain ASCII) messages pack 153 chars/segment
 * beyond the first 160; messages containing non-GSM-7 characters use UCS-2
 * (67 chars/segment beyond the first 70).
 */
export function countSegments(content) {
  if (!content) return 0;
  const isUnicode = /[^\x00-\x7F]/.test(content);
  const len = content.length;
  if (isUnicode) {
    if (len <= 70) return 1;
    return Math.ceil(len / 67);
  }
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}
