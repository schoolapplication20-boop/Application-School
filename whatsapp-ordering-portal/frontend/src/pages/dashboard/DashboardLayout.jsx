import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import Navbar from '../../components/common/Navbar';

const PAGE_TITLES = {
  '/dashboard': 'Overview',
  '/dashboard/orders': 'Orders',
  '/dashboard/customers': 'Customers',
  '/dashboard/products': 'Menu & Products',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
};

const DashboardLayout = () => {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title={title} />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
