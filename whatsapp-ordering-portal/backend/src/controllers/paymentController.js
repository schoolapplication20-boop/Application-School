import {
  Order, Business, Customer, WhatsappConfig, Notification,
} from '../models/index.js';
import { decrypt } from '../utils/crypto.js';
import * as paymentService from '../services/paymentService.js';
import * as whatsappService from '../services/whatsappService.js';
import { ORDER_STATUS, PAYMENT_STATUS, NOTIFICATION_TYPES } from '../utils/constants.js';
import logger from '../utils/logger.js';

const formatMoney = (amount) => `₹${Number(amount).toFixed(2)}`;

const sendPaymentConfirmation = async (order, business, customer) => {
  try {
    const whatsappConfig = await WhatsappConfig.findOne({
      where: { businessId: business.businessId, isConfigured: true },
    });
    if (!whatsappConfig?.accessToken) return;

    const config = {
      phoneNumberId: whatsappConfig.phoneNumberId,
      accessToken:   decrypt(whatsappConfig.accessToken),
    };

    const message = [
      `✅ *Payment Confirmed!*`,
      ``,
      `Order #${order.orderNumber}`,
      `Amount: ${formatMoney(order.totalAmount)}`,
      ``,
      `Thank you! ${business.businessName} has accepted your order and is preparing it now. 🍳`,
    ].join('\n');

    await whatsappService.sendTextMessage(config, customer.whatsappNumber, message);
  } catch (err) {
    logger.error(`[paymentController] Failed to send payment confirmation: ${err.message}`);
  }
};

const processPaymentLinkPaid = async (payload) => {
  const paymentLinkId   = payload.payment_link?.entity?.id;
  const razorpayPayId   = payload.payment?.entity?.id;
  const amountPaise     = payload.payment?.entity?.amount;

  if (!paymentLinkId) {
    logger.warn('[paymentController] payment_link.paid event missing payment_link.entity.id');
    return;
  }

  const order = await Order.findOne({ where: { paymentLinkId } });
  if (!order) {
    logger.warn(`[paymentController] No order found for payment_link_id: ${paymentLinkId}`);
    return;
  }

  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED) {
    logger.info(`[paymentController] Duplicate webhook for order ${order.orderNumber} — ignored`);
    return;
  }

  await order.update({
    paymentStatus:    PAYMENT_STATUS.COMPLETED,
    status:           ORDER_STATUS.ACCEPTED,
    razorpayPaymentId: razorpayPayId,
  });

  logger.info(`[paymentController] Order ${order.orderNumber} marked PAID via Razorpay (${razorpayPayId})`);

  const [business, customer] = await Promise.all([
    Business.findByPk(order.businessId),
    Customer.findByPk(order.customerId),
  ]);

  if (business && customer) {
    await sendPaymentConfirmation(order, business, customer);
  }

  await Notification.create({
    businessId:       order.businessId,
    notificationType: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    title:            'Payment received',
    message:          `Payment of ${formatMoney(amountPaise / 100)} received for order ${order.orderNumber}`,
  }).catch((err) => logger.error(`[paymentController] Notification create failed: ${err.message}`));
};

/**
 * POST /api/v1/payments/webhook/razorpay
 * Responds 200 immediately (required by Razorpay), then processes asynchronously.
 */
export const razorpayWebhook = (req, res) => {
  res.sendStatus(200);

  const signature = req.headers['x-razorpay-signature'];
  const rawBody   = req.rawBody?.toString() || '';

  if (!paymentService.verifyRazorpayWebhook(rawBody, signature)) {
    logger.warn('[paymentController] Razorpay webhook HMAC verification failed');
    return;
  }

  const { event, payload } = req.body || {};
  logger.info(`[paymentController] Razorpay webhook received: ${event}`);

  if (event === 'payment_link.paid') {
    processPaymentLinkPaid(payload).catch((err) =>
      logger.error(`[paymentController] processPaymentLinkPaid error: ${err.message}`),
    );
  }
};

export default { razorpayWebhook };
