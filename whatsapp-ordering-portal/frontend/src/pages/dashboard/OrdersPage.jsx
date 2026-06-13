import { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import * as orderService from '../../services/orderService';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import OrderDetailModal from './OrderDetailModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS,
} from '../../utils/constants';
import { getErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(ORDER_STATUS_LABELS)
    .filter(([value]) => value !== ORDER_STATUS.CART)
    .map(([value, label]) => ({ value, label })),
];

const AVAILABLE_ACTIONS = {
  [ORDER_STATUS.PENDING]: ['accept', 'reject'],
  [ORDER_STATUS.ACCEPTED]: ['complete', 'cancel'],
  [ORDER_STATUS.PREPARING]: ['complete', 'cancel'],
  [ORDER_STATUS.READY]: ['complete', 'cancel'],
  [ORDER_STATUS.DELIVERED]: ['complete', 'cancel'],
};

const ACTION_HANDLERS = {
  accept: orderService.acceptOrder,
  reject: orderService.rejectOrder,
  complete: orderService.completeOrder,
  cancel: orderService.cancelOrder,
};

const ACTION_LABELS = { accept: 'Accept', reject: 'Reject', complete: 'Complete', cancel: 'Cancel' };
const PAST_TENSE = { accept: 'accepted', reject: 'rejected', complete: 'completed', cancel: 'canceled' };
const CONFIRM_MESSAGES = {
  reject: 'Reject this order? This cannot be undone.',
  cancel: 'Cancel this order? This cannot be undone.',
};

const OrdersPage = () => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, loading, refetch } = useFetch(
    () => orderService.listOrders({
      page, limit: PAGE_SIZE, status: status || undefined, search: search || undefined,
    }),
    [page, status, search],
  );

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const handleAction = async (order, action) => {
    if (CONFIRM_MESSAGES[action] && !window.confirm(CONFIRM_MESSAGES[action])) return;

    setActionLoading(`${order.order_id}:${action}`);
    try {
      await ACTION_HANDLERS[action](order.order_id);
      toast.success(`Order ${order.order_number} ${PAST_TENSE[action]}`);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update order'));
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    { key: 'order_number', header: 'Order #' },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => row.customer?.customer_name || row.customer?.whatsapp_number || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={ORDER_STATUS_COLORS[row.status]}>{ORDER_STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (row) => <Badge variant={PAYMENT_STATUS_COLORS[row.payment_status]}>{row.payment_status}</Badge>,
    },
    { key: 'total_amount', header: 'Total', render: (row) => formatCurrency(row.total_amount) },
    { key: 'created_at', header: 'Placed', render: (row) => formatDateTime(row.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-sm">
          <Button size="sm" variant="outline" onClick={() => setSelectedOrderId(row.order_id)}>View</Button>
          {(AVAILABLE_ACTIONS[row.status] || []).map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === 'reject' || action === 'cancel' ? 'danger' : 'primary'}
              loading={actionLoading === `${row.order_id}:${action}`}
              onClick={() => handleAction(row, action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Orders</h2>
      </div>

      <div className="filter-bar">
        <Input
          label="Search"
          placeholder="Order number"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => { setPage(1); setStatus(event.target.value); }}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={orders}
          loading={loading}
          getRowKey={(row) => row.order_id}
          emptyMessage="No orders found"
        />
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="pagination">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <span>
            Page
            {' '}
            {pagination.page}
            {' '}
            of
            {' '}
            {pagination.total_pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} onActionComplete={refetch} />
      )}
    </div>
  );
};

export default OrdersPage;
