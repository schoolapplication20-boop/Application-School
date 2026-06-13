import { NavLink } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import {
  HomeIcon, OrdersIcon, CustomersIcon, ProductsIcon, AnalyticsIcon, SettingsIcon,
} from './Icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: HomeIcon, end: true },
  { to: '/dashboard/orders', label: 'Orders', icon: OrdersIcon },
  { to: '/dashboard/customers', label: 'Customers', icon: CustomersIcon },
  { to: '/dashboard/products', label: 'Menu & Products', icon: ProductsIcon },
  { to: '/dashboard/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { to: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
];

const Sidebar = () => {
  const { business } = useBusiness();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo-mark">W</span>
        <span className="sidebar-brand-name">{business?.business_name || 'WhatsApp Portal'}</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
