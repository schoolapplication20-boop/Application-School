import axios from 'axios';
import logger from '../utils/logger.js';

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export const isConfigured = (config) => Boolean(config?.phoneNumberId && config?.accessToken);

const buildClient = (accessToken) => axios.create({
  baseURL: GRAPH_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const send = async (config, body) => {
  if (!isConfigured(config)) {
    logger.warn('WhatsApp send skipped: business is not configured for WhatsApp messaging');
    return null;
  }

  try {
    const client = buildClient(config.accessToken);
    const { data } = await client.post(`/${config.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...body,
    });
    return data;
  } catch (error) {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error(`WhatsApp API error: ${details}`);
    return null;
  }
};

/**
 * Send a plain text message
 */
export const sendTextMessage = (config, to, text, previewUrl = false) => send(config, {
  to,
  type: 'text',
  text: { body: text, preview_url: previewUrl },
});

/**
 * Send an interactive message with up to 3 reply buttons
 * buttons: [{ id, title }]
 */
export const sendButtonsMessage = (config, to, bodyText, buttons, footerText) => send(config, {
  to,
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { text: bodyText },
    ...(footerText && { footer: { text: footerText } }),
    action: {
      buttons: buttons.slice(0, 3).map((button) => ({
        type: 'reply',
        reply: { id: button.id, title: button.title.slice(0, 20) },
      })),
    },
  },
});

/**
 * Send an interactive list message (max 10 rows total across sections)
 * sections: [{ title, rows: [{ id, title, description }] }]
 */
export const sendListMessage = (config, to, bodyText, buttonText, sections, headerText) => send(config, {
  to,
  type: 'interactive',
  interactive: {
    type: 'list',
    ...(headerText && { header: { type: 'text', text: headerText.slice(0, 60) } }),
    body: { text: bodyText },
    action: {
      button: buttonText.slice(0, 20),
      sections: sections.map((section) => ({
        title: section.title.slice(0, 24),
        rows: section.rows.map((row) => ({
          id: row.id,
          title: row.title.slice(0, 24),
          ...(row.description && { description: row.description.slice(0, 72) }),
        })),
      })),
    },
  },
});

/**
 * Mark an inbound message as read
 */
export const markMessageRead = async (config, messageId) => {
  if (!isConfigured(config)) return null;

  try {
    const client = buildClient(config.accessToken);
    const { data } = await client.post(`/${config.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
    return data;
  } catch (error) {
    const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    logger.error(`WhatsApp markMessageRead error: ${details}`);
    return null;
  }
};

export default {
  isConfigured,
  sendTextMessage,
  sendButtonsMessage,
  sendListMessage,
  markMessageRead,
};
