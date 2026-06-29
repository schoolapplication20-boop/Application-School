import crypto from 'crypto';
import { Business, WhatsappConfig, AuditLog } from '../models/index.js';
import { decrypt } from '../utils/crypto.js';
import * as whatsappService from '../services/whatsappService.js';
import * as chatSessionService from '../services/chatSessionService.js';
import * as conversationService from '../services/conversationService.js';
import logger from '../utils/logger.js';
import { AUDIT_ACTIONS, AUDIT_STATUS } from '../utils/constants.js';

/**
 * Middleware: verify Meta's X-Hub-Signature-256 HMAC before processing webhooks.
 * If WHATSAPP_APP_SECRET is not set the check is skipped (logs a warning).
 */
export const verifyHmac = (req, res, next) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    logger.warn('WHATSAPP_APP_SECRET not set — skipping webhook HMAC verification');
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(403).json({ success: false, message: 'Missing signature' });
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    return res.status(400).json({ success: false, message: 'Raw body unavailable' });
  }

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const received = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (received.length !== expectedBuf.length || !crypto.timingSafeEqual(received, expectedBuf)) {
    logger.warn('Webhook HMAC verification failed');
    return res.status(403).json({ success: false, message: 'Invalid signature' });
  }

  return next();
};

const buildConfig = (whatsappConfig) => ({
  phoneNumberId: whatsappConfig.phoneNumberId,
  accessToken: whatsappConfig.accessToken ? decrypt(whatsappConfig.accessToken) : null,
});

const processMessage = async (business, config, value, message) => {
  const whatsappNumber = message.from;
  const contact = value.contacts?.find((c) => c.wa_id === whatsappNumber);
  const profileName = contact?.profile?.name;

  const customer = await chatSessionService.getOrCreateCustomer(business.businessId, whatsappNumber, profileName);
  const session = await chatSessionService.getOrCreateSession(business.businessId, customer.customerId);

  await whatsappService.markMessageRead(config, message.id);
  await conversationService.handleIncomingMessage({
    business, config, customer, session, message,
  });
};

const processStatus = async (business, status) => {
  logger.info(`WhatsApp status update for business ${business.businessId}: message ${status.id} -> ${status.status}`);

  if (status.status === 'failed') {
    await AuditLog.create({
      businessId: business.businessId,
      action: AUDIT_ACTIONS.WHATSAPP_MESSAGE_FAILED,
      entityType: 'whatsapp_message',
      entityId: status.id,
      changes: status,
      status: AUDIT_STATUS.FAILED,
      errorMessage: status.errors?.[0]?.title || 'WhatsApp message delivery failed',
    });
  }
};

const processWebhookPayload = async (body) => {
  const entries = body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const { value } = change;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!value || !phoneNumberId) continue; // eslint-disable-line no-continue

      const whatsappConfig = await WhatsappConfig.findOne({ where: { phoneNumberId } });
      if (!whatsappConfig) {
        logger.warn(`WhatsApp webhook: no business configured for phone_number_id ${phoneNumberId}`);
        continue; // eslint-disable-line no-continue
      }

      const business = await Business.findByPk(whatsappConfig.businessId);
      if (!business) continue; // eslint-disable-line no-continue

      const config = buildConfig(whatsappConfig);

      for (const message of value.messages || []) {
        await processMessage(business, config, value, message);
      }

      for (const status of value.statuses || []) {
        await processStatus(business, status);
      }
    }
  }
};

/**
 * GET /webhooks/whatsapp/* - Meta webhook verification handshake
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
};

/**
 * POST /webhooks/whatsapp/* - Meta webhook event delivery
 * Responds immediately with 200 (required by Meta) and processes asynchronously.
 */
export const receiveWebhook = (req, res) => {
  res.sendStatus(200);

  processWebhookPayload(req.body).catch((error) => {
    logger.error(`WhatsApp webhook processing error: ${error.message}`);
  });
};

export default { verifyWebhook, receiveWebhook };
