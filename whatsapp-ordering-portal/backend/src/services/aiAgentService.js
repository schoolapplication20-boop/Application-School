/**
 * AI agent powered by Google Gemini 2.0 Flash — free tier (1,500 req/day).
 *
 * Get a free API key at: aistudio.google.com → "Get API key"
 * Set GEMINI_API_KEY in Railway environment variables.
 *
 * Handles free-text customer messages: natural language ordering, menu questions,
 * hours queries, etc. Uses function calling to manage the cart and trigger checkout.
 *
 * Conversation history is stored in session.sessionDataJson.aiHistory (last 20 msgs).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

const MODEL = 'gemini-2.0-flash';
const MAX_TOKENS = 512;
const MAX_HISTORY = 20;
const MAX_LOOP = 6;

let _client = null;
const getClient = () => {
  if (!_client && process.env.GEMINI_API_KEY) {
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _client;
};

export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

// ── System prompt ──────────────────────────────────────────────────────────────

const buildSystemPrompt = (business, categories, products) => {
  const settings = business.settingsJson || {};
  const hours = business.businessHoursJson;

  let hoursText = 'Hours not set.';
  if (hours && typeof hours === 'object') {
    hoursText = Object.entries(hours)
      .map(([day, h]) => (h.open ? `${day}: ${h.from}–${h.to}` : `${day}: Closed`))
      .join(', ');
  }

  const deliveryOpts = settings.deliveryOptions?.join(', ') || 'Pickup';

  let taxText = 'No tax.';
  if (settings.taxEnabled) {
    taxText = `${settings.taxRate || 0}% ${settings.taxName || 'Tax'} (${settings.taxInclusive ? 'price-inclusive' : 'added at checkout'})`;
  }

  let menuText = '';
  for (const cat of categories) {
    const available = products.filter(
      (p) => p.categoryId === cat.categoryId && p.isAvailable,
    );
    if (!available.length) continue;
    menuText += `\n${cat.categoryName}:\n`;
    for (const p of available) {
      menuText += `  • [${p.productId}] ${p.productName} — ₹${Number(p.price).toFixed(2)}`;
      if (p.description) menuText += ` (${p.description})`;
      menuText += '\n';
    }
  }

  return `You are the ordering assistant for *${business.businessName}*, helping customers place food orders via WhatsApp.

Hours: ${hoursText}
Delivery: ${deliveryOpts}
Tax: ${taxText}

MENU:${menuText || '\n  (No items available right now)'}

RULES:
- Keep every reply under 3 sentences. WhatsApp is a chat, not email.
- Use tools to add/remove cart items, check the cart, and trigger checkout.
- When a customer names a dish, look it up in the menu by name and use add_to_cart with the exact product ID shown in [brackets].
- If a product is not on the menu, say so politely.
- When the cart is ready and the customer confirms, call confirm_checkout.
- Never discuss topics unrelated to ordering at ${business.businessName}.`;
};

// ── Tool definitions (Gemini function declarations) ────────────────────────────

const FUNCTION_DECLARATIONS = [
  {
    name: 'add_to_cart',
    description: 'Add a menu item to the customer cart. Use the exact product ID from the menu (shown in [brackets]).',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: { type: 'STRING', description: 'Product ID from the menu' },
        quantity: { type: 'INTEGER', description: 'Number of items to add (minimum 1)' },
      },
      required: ['product_id', 'quantity'],
    },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the cart.',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: { type: 'STRING', description: 'Product ID to remove' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'view_cart',
    description: 'Get the current cart contents to show the customer.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'clear_cart',
    description: 'Remove all items from the cart when the customer wants to start over.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'confirm_checkout',
    description: 'Proceed to checkout. Call this when the customer confirms they are ready to place their order and the cart is not empty.',
    parameters: { type: 'OBJECT', properties: {} },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────────────

const executeTool = (name, args, cart, products) => {
  switch (name) {
    case 'add_to_cart': {
      const product = products.find((p) => p.productId === args.product_id);
      if (!product) return { error: `Product ${args.product_id} not found on the menu.` };
      if (!product.isAvailable) return { error: `${product.productName} is currently unavailable.` };

      const existing = cart.find((i) => i.productId === args.product_id);
      if (existing) {
        existing.quantity += args.quantity;
      } else {
        cart.push({ productId: args.product_id, quantity: args.quantity });
      }
      return {
        success: true,
        added: `${args.quantity}× ${product.productName}`,
        cart_items: cart.reduce((s, i) => s + i.quantity, 0),
      };
    }

    case 'remove_from_cart': {
      const idx = cart.findIndex((i) => i.productId === args.product_id);
      if (idx === -1) return { error: 'Item not in cart.' };
      const [removed] = cart.splice(idx, 1);
      const p = products.find((x) => x.productId === removed.productId);
      return { success: true, removed: p?.productName || removed.productId };
    }

    case 'view_cart': {
      if (!cart.length) return { empty: true, message: 'Cart is empty.' };
      const items = cart.map((i) => {
        const p = products.find((x) => x.productId === i.productId);
        const price = p ? Number(p.price) : 0;
        return {
          name: p?.productName || i.productId,
          qty: i.quantity,
          subtotal: `₹${(price * i.quantity).toFixed(2)}`,
        };
      });
      const total = cart.reduce((s, i) => {
        const p = products.find((x) => x.productId === i.productId);
        return s + (p ? Number(p.price) * i.quantity : 0);
      }, 0);
      return { items, total: `₹${total.toFixed(2)}` };
    }

    case 'clear_cart':
      cart.splice(0, cart.length);
      return { success: true, message: 'Cart cleared.' };

    case 'confirm_checkout':
      if (!cart.length) return { error: 'Cart is empty — add items first.' };
      return { action: 'CHECKOUT' };

    default:
      return { error: `Unknown function: ${name}` };
  }
};

// ── History helpers ────────────────────────────────────────────────────────────

// Convert stored text-only history to Gemini's {role, parts} format.
// Gemini uses "model" instead of "assistant" for the AI role.
const toGeminiHistory = (history) => history.map((m) => ({
  role: m.role === 'assistant' ? 'model' : 'user',
  parts: [{ text: m.content }],
}));

// ── Main entry point ───────────────────────────────────────────────────────────

/**
 * Run the AI agent for a free-text customer message.
 *
 * @returns {{ text: string|null, action: string|null, cart: Array, aiHistory: Array }}
 */
export const runAiAgent = async ({
  business, categories, products, customer, session, userMessage,
}) => {
  const client = getClient();
  if (!client) {
    logger.warn('[aiAgentService] GEMINI_API_KEY not set — AI agent skipped');
    return { text: null, action: null };
  }

  const systemPrompt = buildSystemPrompt(business, categories, products);
  const cart = [...(session.sessionDataJson?.cart || [])];
  const history = (session.sessionDataJson?.aiHistory || []).slice(-MAX_HISTORY);

  const geminiModel = client.getGenerativeModel({
    model: MODEL,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: MAX_TOKENS },
  });

  const chat = geminiModel.startChat({ history: toGeminiHistory(history) });

  let responseText = null;
  let checkoutTriggered = false;
  let currentParts = [{ text: userMessage }];

  try {
    for (let turn = 0; turn < MAX_LOOP; turn += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await chat.sendMessage(currentParts);
      const response = result.response;

      const functionCalls = response.functionCalls?.() ?? [];

      if (!functionCalls.length) {
        responseText = response.text?.() || null;
        break;
      }

      // Execute each function call and collect responses
      currentParts = functionCalls.map((fc) => {
        const toolResult = executeTool(fc.name, fc.args, cart, products);
        if (toolResult.action === 'CHECKOUT') checkoutTriggered = true;

        return {
          functionResponse: {
            name: fc.name,
            response: toolResult,
          },
        };
      });
    }
  } catch (err) {
    logger.error(`[aiAgentService] Gemini API error: ${err.message}`);
    return { text: null, action: null };
  }

  // Build updated text-only history
  const newHistory = [
    ...history,
    { role: 'user', content: userMessage },
    ...(responseText ? [{ role: 'assistant', content: responseText }] : []),
  ].slice(-MAX_HISTORY);

  logger.info(`[aiAgentService] Gemini responded for ${customer.whatsappNumber}: "${responseText?.slice(0, 60)}"`);

  return {
    text: responseText,
    action: checkoutTriggered ? 'CHECKOUT' : null,
    cart,
    aiHistory: newHistory,
  };
};

export default { isConfigured, runAiAgent };
