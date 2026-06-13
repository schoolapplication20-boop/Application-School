import PropTypes from 'prop-types';
import { useFetch } from '../../hooks/useFetch';
import * as customerService from '../../services/customerService';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../../utils/constants';

const CustomerDetailModal = ({ customerId, onClose }) => {
  const { data, loading } = useFetch(() => customerService.getCustomer(customerId), [customerId]);
  const customer = data?.customer;
  const recentOrders = data?.recent_orders || [];

  const columns = [
    { key: 'order_number', header: 'Order #' },
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
  ];

  return (
    <Modal
      title={customer ? (customer.customer_name || customer.whatsapp_number) : 'Customer details'}
      isOpen
      onClose={onClose}
      size="lg"
    >
      {loading && <p className="text-muted">Loading customer...</p>}
      {!loading && customer && (
        <>
          <div className="detail-grid">
            <div>
              <div className="detail-item-label">WhatsApp number</div>
              <div className="detail-item-value">{customer.whatsapp_number}</div>
            </div>
            <div>
              <div className="detail-item-label">Phone number</div>
              <div className="detail-item-value">{customer.phone_number || '-'}</div>
            </div>
            <div>
              <div className="detail-item-label">Email</div>
              <div className="detail-item-value">{customer.email || '-'}</div>
            </div>
            <div>
              <div className="detail-item-label">Address</div>
              <div className="detail-item-value">{customer.address || '-'}</div>
            </div>
            <div>
              <div className="detail-item-label">Total orders</div>
              <div className="detail-item-value">{customer.total_orders}</div>
            </div>
            <div>
              <div className="detail-item-label">Total spent</div>
              <div className="detail-item-value">{formatCurrency(customer.total_spent)}</div>
            </div>
            <div>
              <div className="detail-item-label">Last order</div>
              <div className="detail-item-value">{formatDateTime(customer.last_order_at)}</div>
            </div>
            <div>
              <div className="detail-item-label">Customer since</div>
              <div className="detail-item-value">{formatDateTime(customer.created_at)}</div>
            </div>
          </div>

          <h4>Recent orders</h4>
          <Table columns={columns} data={recentOrders} getRowKey={(row) => row.order_id} emptyMessage="No orders yet" />
        </>
      )}
    </Modal>
  );
};

CustomerDetailModal.propTypes = {
  customerId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CustomerDetailModal;
