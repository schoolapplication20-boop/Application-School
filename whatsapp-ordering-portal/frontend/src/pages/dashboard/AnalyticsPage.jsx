import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import * as analyticsService from '../../services/analyticsService';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/constants';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

const AnalyticsPage = () => {
  const [period, setPeriod] = useState('day');

  const { data: salesData, loading: salesLoading } = useFetch(
    () => analyticsService.getSalesData({ period }),
    [period],
  );

  const { data: trendsData, loading: trendsLoading } = useFetch(() => analyticsService.getOrderTrends(), []);

  const sales = salesData?.sales || [];
  const statusBreakdown = trendsData?.status_breakdown || [];
  const dailyOrders = trendsData?.daily_orders || [];

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
        <Select value={period} onChange={(event) => setPeriod(event.target.value)} options={PERIOD_OPTIONS} />
      </div>

      <div className="card section-card mb-lg">
        <h3>Revenue over time</h3>
        {!salesLoading && sales.length === 0 && <p className="empty-state">No sales data for this period.</p>}
        {sales.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => formatDate(value)} />
              <YAxis />
              <Tooltip labelFormatter={(value) => formatDate(value)} formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#25d366" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card section-card">
          <h3>Orders per day</h3>
          {!trendsLoading && dailyOrders.length === 0 && <p className="empty-state">No order data yet.</p>}
          {dailyOrders.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => formatDate(value)} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(value) => formatDate(value)} />
                <Bar dataKey="orders" fill="#128c7e" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card section-card">
          <h3>Orders by status</h3>
          {!trendsLoading && statusBreakdown.length === 0 && <p className="empty-state">No order data yet.</p>}
          {statusBreakdown.length > 0 && (
            <ul className="status-breakdown-list">
              {statusBreakdown.map((item) => (
                <li className="status-breakdown-row" key={item.status}>
                  <Badge variant={ORDER_STATUS_COLORS[item.status]}>{ORDER_STATUS_LABELS[item.status]}</Badge>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
