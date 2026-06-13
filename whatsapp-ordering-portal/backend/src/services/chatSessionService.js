import { Customer, ChatSession } from '../models/index.js';
import { SESSION_STATES } from '../utils/constants.js';

/**
 * Find the customer for an inbound WhatsApp number, creating one if needed
 */
export const getOrCreateCustomer = async (businessId, whatsappNumber, profileName) => {
  const [customer, created] = await Customer.findOrCreate({
    where: { businessId, whatsappNumber },
    defaults: {
      customerName: profileName || null,
      phoneNumber: whatsappNumber,
    },
  });

  if (!created && profileName && !customer.customerName) {
    customer.customerName = profileName;
    await customer.save();
  }

  return customer;
};

/**
 * Find the customer's active chat session, creating one if needed
 */
export const getOrCreateSession = async (businessId, customerId) => {
  let session = await ChatSession.findOne({
    where: { businessId, customerId, isActive: true },
    order: [['lastMessageAt', 'DESC']],
  });

  if (!session) {
    session = await ChatSession.create({
      businessId,
      customerId,
      sessionState: SESSION_STATES.MENU,
      sessionDataJson: { cart: [] },
      lastMessageAt: new Date(),
      isActive: true,
    });
  }

  if (!session.sessionDataJson) {
    session.sessionDataJson = { cart: [] };
  }

  return session;
};

export const touchSession = async (session) => {
  session.lastMessageAt = new Date();
  await session.save();
};

/**
 * Reset a session back to the main menu with an empty cart
 */
export const resetSession = async (session, state = SESSION_STATES.MENU) => {
  session.sessionState = state;
  session.sessionDataJson = { cart: [] };
  session.orderId = null;
  await session.save();
};

export default {
  getOrCreateCustomer,
  getOrCreateSession,
  touchSession,
  resetSession,
};
