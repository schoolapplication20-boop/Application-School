import React from 'react';

const ICON_VARIANTS = {
  edit: { className: 'action-btn action-btn-edit', icon: 'edit', title: 'Edit' },
  delete: { className: 'action-btn action-btn-delete', icon: 'delete', title: 'Delete' },
  view: { className: 'action-btn action-btn-view', icon: 'visibility', title: 'View' },
  'exam-action': { className: 'exam-action-btn', icon: '', title: '' },
};

const VARIANT_CLASS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
  success: 'btn btn-success',
  add: 'btn-add',
  'exam-primary': 'btn-exam-primary',
  'exam-secondary': 'btn-exam-secondary',
  'bim-primary': 'bim-btn-primary',
  'bim-outline': 'bim-btn-outline',
  'bim-ghost': 'bim-btn-ghost',
  'bim-xs': 'bim-btn-xs',
  back: 'btn-back',
};

/**
 * Shared button component covering the portal's common conventions:
 * - icon-only row actions (variant="edit"|"delete"|"view"|"exam-action", optional className="danger"|"success"|"primary" modifier)
 * - bootstrap buttons (variant="primary"|"secondary"|"danger"|"success", optional size="sm")
 * - the "+ Add X" header button (variant="add")
 * - examination module buttons (variant="exam-primary"|"exam-secondary")
 * - bulk import modal buttons (variant="bim-primary"|"bim-outline"|"bim-ghost"|"bim-xs")
 * - auth "back" link button (variant="back")
 *
 * Renders the same markup/classes as the patterns it replaces, so no CSS changes are needed.
 */
export default function Button({ variant = 'primary', size, icon, children, className = '', title, ...rest }) {
  if (ICON_VARIANTS[variant]) {
    const v = ICON_VARIANTS[variant];
    const classes = [v.className, className].filter(Boolean).join(' ');
    return (
      <button type="button" className={classes} title={title || v.title} {...rest}>
        <span className="material-icons">{icon || v.icon}</span>
      </button>
    );
  }

  const base = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;
  const classes = [base, size && `btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} title={title} {...rest}>
      {icon && <span className="material-icons">{icon}</span>}
      {children}
    </button>
  );
}
