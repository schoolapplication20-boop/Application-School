// Shared constants/helpers for the WhatsApp admin module.

export const TARGET_TYPES = [
  { value: 'STUDENTS', label: 'Specific Students', icon: 'person_search', desc: 'Hand-pick individual students' },
  { value: 'FEE_DUE',  label: 'Fee Due',           icon: 'payments',      desc: 'Students with a pending, overdue, or partial fee' },
];

export const WHATSAPP_CATEGORIES = [
  { value: 'FEE_REMINDER',         label: 'Fee Reminder' },
  { value: 'PAYMENT_CONFIRMATION', label: 'Payment Confirmation' },
  { value: 'RECEIPT_LINK',         label: 'Receipt Link' },
  { value: 'GENERAL',              label: 'General' },
];

export const APPROVAL_STATUS_META = {
  PENDING:  { label: 'Pending Meta approval', color: '#c05621', bg: '#fffaf0' },
  APPROVED: { label: 'Approved',              color: '#276749', bg: '#f0fff4' },
  REJECTED: { label: 'Rejected',              color: '#c53030', bg: '#fff5f5' },
};

export const CAMPAIGN_STATUS_META = {
  DRAFT:     { label: 'Draft',      color: '#718096', bg: '#edf2f7' },
  PROCESSING:{ label: 'Processing', color: '#2b6cb0', bg: '#ebf8ff' },
  COMPLETED: { label: 'Completed',  color: '#276749', bg: '#f0fff4' },
  CANCELLED: { label: 'Cancelled',  color: '#a0aec0', bg: '#f7fafc' },
};

export const LOG_STATUS_META = {
  SENT:      { label: 'Sent',      color: '#2b6cb0', bg: '#ebf8ff' },
  DELIVERED: { label: 'Delivered', color: '#276749', bg: '#f0fff4' },
  READ:      { label: 'Read',      color: '#553c9a', bg: '#faf5ff' },
  FAILED:    { label: 'Failed',    color: '#c53030', bg: '#fff5f5' },
};

export function targetLabel(value) {
  return TARGET_TYPES.find(t => t.value === value)?.label || value;
}

export function categoryLabel(value) {
  return WHATSAPP_CATEGORIES.find(c => c.value === value)?.label || value;
}

export function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Parses the JSON-array variableLabels column into a plain string array. */
export function parseVariableLabels(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
