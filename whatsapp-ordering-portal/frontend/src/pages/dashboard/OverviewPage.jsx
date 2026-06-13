import { useFetch } from '../../hooks/useFetch';
import * as analyticsService from '../../services/analyticsService';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/constants';

const OverviewPage = () => {
  const { data, loading } = useFetch(() => analyticsService.getDashboardStats(), []);
  const stats = data || {};

  const orderColumns = [
    { key: 'order_number', header: 'Order #' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={ORDER_STATUS_COLORS[row.status]}>{ORDER_STATUS_LABELS[row.status]}</Badge>,
    },
    { key: 'total_amount', header: 'Total', render: (row) => formatCurrency(row.total_amount) },
    { key: 'created_at', header: 'Placed', render: (row) => formatDateTime(row.created_at) },
  ];

  const productColumns = [
    { key: 'product_name', header: 'Product' },
    { key: 'total_quantity', header: 'Sold' },
    { key: 'total_revenue', header: 'Revenue', render: (row) => formatCurrency(row.total_revenue) },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Overview</h2>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-card-label">Total revenue</div>
          <div className="stat-card-value">{formatCurrency(stats.total_revenue)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Today&apos;s revenue</div>
          <div className="stat-card-value">{formatCurrency(stats.today_revenue)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Total orders</div>
          <div className="stat-card-value">{stats.total_orders ?? 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Today&apos;s orders</div>
          <div className="stat-card-value">{stats.today_orders ?? 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Pending orders</div>
          <div className="stat-card-value">{stats.pending_orders ?? 0}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Total customers</div>
          <div className="stat-card-value">{stats.total_customers ?? 0}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card section-card">
          <h3>Recent orders</h3>
          <Table
            columns={orderColumns}
            data={stats.recent_orders || []}
            loading={loading}
            getRowKey={(row) => row.order_id}
            emptyMessage="No orders yet"
          />
        </div>
        <div className="card section-card">
          <h3>Top products</h3>
          <Table
            columns={productColumns}
            data={stats.top_products || []}
            loading={loading}
            getRowKey={(row) => row.product_id}
            emptyMessage="No sales data yet"
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
