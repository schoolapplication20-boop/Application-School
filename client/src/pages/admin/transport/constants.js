export const ITEMS_PER_PAGE = 6;

export const statusColor = {
  Active: 'status-present',
  Inactive: 'status-absent',
  Maintenance: 'status-pending',
  'On Leave': 'status-pending',
  Pending: 'status-pending', PENDING: 'status-pending',
  Paid:    'status-paid',    PAID:    'status-paid',
  Overdue: 'status-overdue', OVERDUE: 'status-overdue',
};

// Tabs in logical setup order: Route → Stops → Bus → Driver → Student → Fees
export const TABS = [
  { key: 'routes',   label: 'Routes',   icon: 'route' },
  { key: 'stops',    label: 'Stops',    icon: 'place' },
  { key: 'buses',    label: 'Buses',    icon: 'directions_bus' },
  { key: 'drivers',  label: 'Drivers',  icon: 'badge' },
  { key: 'students', label: 'Students', icon: 'people' },
  { key: 'fees',     label: 'Fees',     icon: 'payments' },
];
