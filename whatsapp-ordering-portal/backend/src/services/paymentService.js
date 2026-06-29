/**
 * Razorpay Payment Links integration — multi-tenant.
 *
 * Each business stores their own Razorpay credentials in:
 *   business.settingsJson.paymentConfigs.razorpay = {
 *     keyId:             "rzp_live_xxx"      (plain — public identifier)
 *     keySecretEnc:      "iv:tag:hex"        (AES-256-GCM encrypted)
 *     webhookSecretEnc:  "iv:tag:hex"        (AES-256-GCM encrypted)
 *   }
 *
 * Each business registers their own webhook URL with Razorpay:
 *   POST /api/v1/payments/webhook/razorpay/:businessId
 *
 * The HMAC is then verified using that business's own webhookSecret.
 */

import crypto from 'crypto';
import axios from 'axios';
import { decrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

const safeDecrypt = (enc) => {
  try { return enc ? decrypt(enc) : null; } catch { return null; }
};

const getCredentials = (business) => {
  const cfg = business?.settingsJson?.paymentConfigs?.razorpay;
  if (cfg?.keyId && cfg?.keySecretEnc) {
    const keySecret = safeDecrypt(cfg.keySecretEnc);
    if (keySecret) return { keyId: cfg.keyId, keySecret };
  }
  // Platform-level fallback (useful for testing without per-business setup)
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET };
  }
  return null;
};

export const getWebhookSecret = (business) => {
  const cfg = business?.settingsJson?.paymentConfigs?.razorpay;
  const fromBusiness = cfg?.webhookSecretEnc ? safeDecrypt(cfg.webhookSecretEnc) : null;
  return fromBusiness || process.env.RAZORPAY_WEBHOOK_SECRET || null;
};

export const isRazorpayConfigured = (business) => Boolean(getCredentials(business));

export const isOnlinePayment = (paymentMethod) =>
  ['ONLINE', 'RAZORPAY', 'CARD'].includes((paymentMethod || '').toUpperCase());

/**
 * Create a Razorpay Payment Link for the given order.
 * Returns { paymentLinkId, paymentLinkUrl } or null if Razorpay not configured.
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
      order_id:    order.orderId,
      order_number: order.orderNumber,
      business_id: business.businessId,
    },
    expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  const { data } = await axios.post(`${RAZORPAY_API}/payment_links`, payload, {
    headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  logger.info(`[paymentService] Payment link created: ${data.id} for order ${order.orderNumber}`);
  return { paymentLinkId: data.id, paymentLinkUrl: data.short_url };
};

/**
 * Verify the X-Razorpay-Signature header using the business's stored webhook secret.
 */
export const verifyRazorpayWebhook = (rawBody, signature, webhookSecret) => {
  if (!webhookSecret) {
    logger.warn('[paymentService] No webhook secret available — skipping HMAC verification');
    return true;
  }
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
};

export default {
  isRazorpayConfigured,
  isOnlinePayment,
  createPaymentLink,
  getWebhookSecret,
  verifyRazorpayWebhook,
};
