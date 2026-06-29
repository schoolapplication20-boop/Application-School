/**
 * Razorpay Payment Links integration.
 *
 * Each business can use their own Razorpay keys (stored in settingsJson.paymentConfigs.razorpay)
 * or fall back to the platform-level RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars.
 *
 * Webhook verification always uses the global RAZORPAY_WEBHOOK_SECRET set on the
 * Razorpay dashboard webhook settings page.
 */

import crypto from 'crypto';
import axios from 'axios';
import logger from '../utils/logger.js';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

const getCredentials = (business) => {
  const cfg = business?.settingsJson?.paymentConfigs?.razorpay;
  if (cfg?.keyId && cfg?.keySecret) {
    return { keyId: cfg.keyId, keySecret: cfg.keySecret };
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    };
  }
  return null;
};

export const isRazorpayConfigured = (business) => Boolean(getCredentials(business));

export const isOnlinePayment = (paymentMethod) =>
  ['ONLINE', 'RAZORPAY', 'CARD'].includes((paymentMethod || '').toUpperCase());

/**
 * Create a Razorpay Payment Link for an order.
 * Returns { paymentLinkId, paymentLinkUrl } on success, null if not configured.
 */
export const createPaymentLink = async (order, business, customer) => {
  const creds = getCredentials(business);
  if (!creds) return null;

  const amountPaise = Math.round(Number(order.totalAmount) * 100);
  if (amountPaise <= 0) return null;

  const basicAuth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');

  const payload = {
    amount: amountPaise,
    currency: 'INR',
    accept_partial: false,
    description: `Order ${order.orderNumber} — ${business.businessName}`,
    customer: {
      name: customer.customerName || 'Customer',
      contact: `+${customer.whatsappNumber.replace(/^\+/, '')}`,
    },
    notify: { sms: true, email: false },
    reminder_enable: true,
    notes: {
      order_id: order.orderId,
      order_number: order.orderNumber,
      business_id: business.businessId,
    },
    expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  const { data } = await axios.post(`${RAZORPAY_API}/payment_links`, payload, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  logger.info(`[paymentService] Payment link created: ${data.id} for order ${order.orderNumber}`);
  return { paymentLinkId: data.id, paymentLinkUrl: data.short_url };
};

/**
 * Verify the X-Razorpay-Signature header on an incoming webhook.
 */
export const verifyRazorpayWebhook = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('[paymentService] RAZORPAY_WEBHOOK_SECRET not set — skipping webhook verification');
    return true;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
};

export default { isRazorpayConfigured, isOnlinePayment, createPaymentLink, verifyRazorpayWebhook };
