import PropTypes from 'prop-types';

const iconPropTypes = {
  className: PropTypes.string,
};

const iconDefaultProps = {
  className: '',
};

const baseProps = (className) => ({
  className,
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
});

export const HomeIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);
HomeIcon.propTypes = iconPropTypes;
HomeIcon.defaultProps = iconDefaultProps;

export const OrdersIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M4 7h16l-1.5 11.2A2 2 0 0 1 16.5 20h-9a2 2 0 0 1-2-1.8L4 7Z" />
    <path d="M9 11v3M15 11v3M8 7V5a4 4 0 0 1 8 0v2" />
  </svg>
);
OrdersIcon.propTypes = iconPropTypes;
OrdersIcon.defaultProps = iconDefaultProps;

export const CustomersIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.5 19.5c0-3 3-5.25 6.5-5.25s6.5 2.25 6.5 5.25" />
    <path d="M16 4.5a3.25 3.25 0 0 1 0 6.5" />
    <path d="M15.5 14.5c2.7.4 5 2.4 5 5" />
  </svg>
);
CustomersIcon.propTypes = iconPropTypes;
CustomersIcon.defaultProps = iconDefaultProps;

export const ProductsIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5Z" />
    <path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
    <path d="M12 12v8.5" />
  </svg>
);
ProductsIcon.propTypes = iconPropTypes;
ProductsIcon.defaultProps = iconDefaultProps;

export const AnalyticsIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M4 19V5M4 19h16" />
    <rect x="7" y="11" width="3" height="5" rx="0.5" />
    <rect x="12" y="8" width="3" height="8" rx="0.5" />
    <rect x="17" y="5" width="3" height="11" rx="0.5" />
  </svg>
);
AnalyticsIcon.propTypes = iconPropTypes;
AnalyticsIcon.defaultProps = iconDefaultProps;

export const SettingsIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.8 1.8 0 0 0 .36 1.98l.04.04a2.16 2.16 0 1 1-3.06 3.06l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V20a2.16 2.16 0 0 1-4.32 0v-.06a1.8 1.8 0 0 0-1.18-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04A2.16 2.16 0 1 1 2.98 15.5l.04-.04a1.8 1.8 0 0 0 .36-1.98 1.8 1.8 0 0 0-1.66-1.1H1.6a2.16 2.16 0 0 1 0-4.32h.06a1.8 1.8 0 0 0 1.66-1.18 1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.16 2.16 0 1 1 6 1.78l.04.04a1.8 1.8 0 0 0 1.98.36h.08a1.8 1.8 0 0 0 1.1-1.66V0.4a2.16 2.16 0 0 1 4.32 0v.06a1.8 1.8 0 0 0 1.1 1.66h.08a1.8 1.8 0 0 0 1.98-.36l.04-.04A2.16 2.16 0 1 1 19.7 4.8l-.04.04a1.8 1.8 0 0 0-.36 1.98v.08a1.8 1.8 0 0 0 1.66 1.1h.18a2.16 2.16 0 0 1 0 4.32h-.06a1.8 1.8 0 0 0-1.66 1.1Z" />
  </svg>
);
SettingsIcon.propTypes = iconPropTypes;
SettingsIcon.defaultProps = iconDefaultProps;

export const BellIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
BellIcon.propTypes = iconPropTypes;
BellIcon.defaultProps = iconDefaultProps;

export const SunIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
  </svg>
);
SunIcon.propTypes = iconPropTypes;
SunIcon.defaultProps = iconDefaultProps;

export const MoonIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </svg>
);
MoonIcon.propTypes = iconPropTypes;
MoonIcon.defaultProps = iconDefaultProps;

export const LogoutIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
LogoutIcon.propTypes = iconPropTypes;
LogoutIcon.defaultProps = iconDefaultProps;

export const MenuIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
MenuIcon.propTypes = iconPropTypes;
MenuIcon.defaultProps = iconDefaultProps;

export const ChevronDownIcon = ({ className }) => (
  <svg {...baseProps(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
ChevronDownIcon.propTypes = iconPropTypes;
ChevronDownIcon.defaultProps = iconDefaultProps;
