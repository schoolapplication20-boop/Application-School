import { useState } from 'react';
import PropTypes from 'prop-types';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../hooks/useToast';
import * as orderService from '../../services/orderService';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS, DELIVERY_TYPE_LABELS,
} from '../../utils/constants';
import { getErrorMessage } from '../../utils/errors';

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

const OrderDetailModal = ({ orderId, onClose, onActionComplete }) => {
  const toast = useToast();
  const [actionLoading, setActionLoading] = useState(null);
  const { data, loading, setData } = useFetch(() => orderService.getOrder(orderId), [orderId]);

  const order = data?.order;

  const handleAction = async (action) => {
    if (CONFIRM_MESSAGES[action] && !window.confirm(CONFIRM_MESSAGES[action])) return;

    setActionLoading(action);
    try {
      const result = await ACTION_HANDLERS[action](orderId);
      setData({ order: result.order });
      toast.success(`Order ${order.order_number} ${PAST_TENSE[action]}`);
      onActionComplete();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update order'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Modal title={order ? `Order ${order.order_number}` : 'Order details'} isOpen onClose={onClose} size="lg">
      {loading && <p className="text-muted">Loading order...</p>}
      {!loading && order && (
        <>
          <div className="detail-grid">
            <div>
              <div className="detail-item-label">Status</div>
              <Badge variant={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            </div>
            <div>
              <div className="detail-item-label">Payment</div>
              <Badge variant={PAYMENT_STATUS_COLORS[order.payment_status]}>{order.payment_status}</Badge>
            </div>
            <div>
              <div className="detail-item-label">Customer</div>
              <div className="detail-item-value">{order.customer?.customer_name || order.customer?.whatsapp_number || '-'}</div>
            </div>
            <div>
              <div className="detail-item-label">Phone</div>
              <div className="detail-item-value">{order.customer?.phone_number || order.customer?.whatsapp_number || '-'}</div>
            </div>
            <div>
              <div className="detail-item-label">Delivery type</div>
              <div className="detail-item-value">{DELIVERY_TYPE_LABELS[order.delivery_type] || order.delivery_type}</div>
            </div>
            <div>
              <div className="detail-item-label">Placed</div>
              <div className="detail-item-value">{formatDateTime(order.created_at)}</div>
            </div>
            {order.delivery_address && (
              <div>
                <div className="detail-item-label">Delivery address</div>
                <div className="detail-item-value">{order.delivery_address}</div>
              </div>
            )}
            {order.notes && (
              <div>
                <div className="detail-item-label">Notes</div>
                <div className="detail-item-value">{order.notes}</div>
              </div>
            )}
          </div>

          <h4>Items</h4>
          <div className="order-items-list">
            {(order.items || []).map((item) => (
              <div className="order-item-row" key={item.order_item_id}>
                <div>
                  <div>
                    {item.quantity}
                    {' '}
                    &times;
                    {' '}
                    {item.product_name}
                  </div>
                  {item.addons?.length > 0 && (
                    <div className="order-item-addons">
                      {item.addons.map((addon) => addon.addon_name).join(', ')}
                    </div>
                  )}
                  {item.special_instructions && (
                    <div className="order-item-addons">
                      Note:
                      {' '}
                      {item.special_instructions}
                    </div>
                  )}
                </div>
                <div>{formatCurrency(item.total_price)}</div>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <div className="order-totals-row">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="order-totals-row">
              <span>Tax</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="order-totals-row">
              <span>Delivery fee</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="order-totals-row">
                <span>Discount</span>
                <span>
                  -
                  {formatCurrency(order.discount_amount)}
                </span>
              </div>
            )}
            <div className="order-totals-row total">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {(AVAILABLE_ACTIONS[order.status] || []).length > 0 && (
            <div className="order-actions">
              {AVAILABLE_ACTIONS[order.status].map((action) => (
                <Button
                  key={action}
                  variant={action === 'reject' || action === 'cancel' ? 'danger' : 'primary'}
                  loading={actionLoading === action}
                  onClick={() => handleAction(action)}
                >
                  {ACTION_LABELS[action]}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

OrderDetailModal.propTypes = {
  orderId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onActionComplete: PropTypes.func.isRequired,
};

export default OrderDetailModal;
