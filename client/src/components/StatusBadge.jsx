const STATUS_STYLES = {
  // Fee statuses
  PAID:           { bg: '#dcfce7', color: '#16a34a', label: 'Paid' },
  PARTIALLY_PAID: { bg: '#fef9c3', color: '#ca8a04', label: 'Partially Paid' },
  PENDING:        { bg: '#fee2e2', color: '#dc2626', label: 'Pending' },
  UNPAID:         { bg: '#fee2e2', color: '#dc2626', label: 'Unpaid' },
  OVERDUE:        { bg: '#fecaca', color: '#b91c1c', label: 'Overdue' },
  WAIVED:         { bg: '#e0e7ff', color: '#4338ca', label: 'Waived' },
  // General statuses
  ACTIVE:         { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  INACTIVE:       { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
  APPROVED:       { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
  REJECTED:       { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  OPEN:           { bg: '#dbeafe', color: '#1d4ed8', label: 'Open' },
  CLOSED:         { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
  IN_PROGRESS:    { bg: '#fef9c3', color: '#ca8a04', label: 'In Progress' },
  RESOLVED:       { bg: '#dcfce7', color: '#16a34a', label: 'Resolved' },
  DRAFT:          { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  PUBLISHED:      { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
};

export default function StatusBadge({ status, label: labelOverride, style = {} }) {
  const s = STATUS_STYLES[status?.toUpperCase?.()] || { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {labelOverride || s.label}
    </span>
  );
}
