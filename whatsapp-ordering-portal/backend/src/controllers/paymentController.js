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
    logger.error(`[paymentController] WhatsApp confirmation failed: ${err.message}`);
  }
};

const processPaymentLinkPaid = async (payload, business) => {
  const paymentLinkId  = payload.payment_link?.entity?.id;
  const razorpayPayId  = payload.payment?.entity?.id;
  const amountPaise    = payload.payment?.entity?.amount;

  if (!paymentLinkId) {
    logger.warn('[paymentController] payment_link.paid missing payment_link.entity.id');
    return;
  }

  // Only match orders belonging to this business (prevents cross-tenant spoofing)
  const order = await Order.findOne({
    where: { paymentLinkId, businessId: business.businessId },
  });

  if (!order) {
    logger.warn(`[paymentController] No order for payment_link_id ${paymentLinkId} / business ${business.businessId}`);
    return;
  }

  if (order.paymentStatus === PAYMENT_STATUS.COMPLETED) {
    logger.info(`[paymentController] Duplicate webhook for order ${order.orderNumber} — ignored`);
    return;
  }

  await order.update({
    paymentStatus:     PAYMENT_STATUS.COMPLETED,
    status:            ORDER_STATUS.ACCEPTED,
    razorpayPaymentId: razorpayPayId,
  });

  logger.info(`[paymentController] Order ${order.orderNumber} marked PAID (${razorpayPayId})`);

  const customer = await Customer.findByPk(order.customerId);
  if (customer) await sendPaymentConfirmation(order, business, customer);

  await Notification.create({
    businessId:       business.businessId,
    notificationType: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    title:            'Payment received',
    message:          `Payment of ${formatMoney(amountPaise / 100)} received for order ${order.orderNumber}`,
  }).catch((err) => logger.error(`[paymentController] Notification failed: ${err.message}`));
};

/**
 * POST /api/v1/payments/webhook/razorpay/:businessId
 *
 * Each restaurant registers this URL with THEIR businessId on Razorpay's dashboard.
 * HMAC is verified using that business's stored webhookSecret (encrypted at rest).
 */
export const razorpayWebhook = async (req, res) => {
  res.sendStatus(200); // Respond immediately — Razorpay requires a fast 200

  const { businessId } = req.params;
  const signature = req.headers['x-razorpay-signature'];
  const rawBody   = req.rawBody?.toString() || '';

  const business = await Business.findByPk(businessId).catch(() => null);
  if (!business) {
    logger.warn(`[paymentController] Webhook for unknown businessId: ${businessId}`);
    return;
  }

  const webhookSecret = paymentService.getWebhookSecret(business);
  if (!paymentService.verifyRazorpayWebhook(rawBody, signature, webhookSecret)) {
    logger.warn(`[paymentController] HMAC verification failed for business ${businessId}`);
    return;
  }

  const { event, payload } = req.body || {};
  logger.info(`[paymentController] Razorpay event "${event}" for business ${businessId}`);

  if (event === 'payment_link.paid') {
    processPaymentLinkPaid(payload, business).catch((err) =>
      logger.error(`[paymentController] processPaymentLinkPaid error: ${err.message}`),
    );
  }
};

export default { razorpayWebhook };
