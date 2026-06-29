/**
 * AI agent powered by Claude claude-haiku-4-5 (fast + cheap — ideal for per-message WhatsApp chat).
 *
 * Handles free-text customer messages: natural language ordering, menu questions,
 * hours queries, etc. Uses tool use to manage the cart and trigger checkout.
 *
 * Integration: called as a fallback when no structured button handler matches.
 * Conversation history is stored in session.sessionDataJson.aiHistory (last 20 msgs).
 */

import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;
const MAX_HISTORY = 20;
const MAX_LOOP = 6;

let _client = null;
const getClient = () => {
  if (!_client && process.env.ANTHROPIC_API_KEY) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
};

export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// ── System prompt ──────────────────────────────────────────────────────────────

const buildSystemPrompt = (business, categories, products) => {
  const settings = business.settingsJson || {};
  const hours = business.businessHoursJson;

  let hoursText = 'Hours not set.';
  if (hours && typeof hours === 'object') {
    const lines = Object.entries(hours)
      .map(([day, h]) => (h.open ? `${day}: ${h.from}–${h.to}` : `${day}: Closed`))
      .join(', ');
    hoursText = lines || 'Hours not set.';
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

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'add_to_cart',
    description: 'Add a menu item to the customer cart. Call this when a customer asks to order a specific item. Use the exact product ID from the menu.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID from the menu (shown in [brackets])' },
        quantity: { type: 'integer', minimum: 1, description: 'Number of items to add' },
      },
      required: ['product_id', 'quantity'],
    },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the cart.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product ID to remove' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'view_cart',
    description: 'Get the current cart contents to share with the customer.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'clear_cart',
    description: 'Remove all items from the cart when the customer wants to start over.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'confirm_checkout',
    description: 'Proceed to checkout. Call this when the customer has confirmed they are ready to place the order and the cart is not empty.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ── Tool executor ──────────────────────────────────────────────────────────────

const executeTool = (name, input, cart, products) => {
  switch (name) {
    case 'add_to_cart': {
      const product = products.find((p) => p.productId === input.product_id);
      if (!product) return { error: `Product ${input.product_id} not found on the menu.` };
      if (!product.isAvailable) return { error: `${product.productName} is currently unavailable.` };

      const existing = cart.find((i) => i.productId === input.product_id);
      if (existing) {
        existing.quantity += input.quantity;
      } else {
        cart.push({ productId: input.product_id, quantity: input.quantity });
      }
      const total = cart.reduce((s, i) => s + i.quantity, 0);
      return { success: true, added: `${input.quantity}× ${product.productName}`, cart_items: total };
    }

    case 'remove_from_cart': {
      const idx = cart.findIndex((i) => i.productId === input.product_id);
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
        return { name: p?.productName || i.productId, qty: i.quantity, unit: `₹${price.toFixed(2)}`, subtotal: `₹${(price * i.quantity).toFixed(2)}` };
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
      return { error: `Unknown tool: ${name}` };
  }
};

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
    logger.warn('[aiAgentService] ANTHROPIC_API_KEY not set — AI agent skipped');
    return { text: null, action: null };
  }

  const systemPrompt = buildSystemPrompt(business, categories, products);

  // Cart is mutable — changes here persist via the returned value
  const cart = [...(session.sessionDataJson?.cart || [])];

  // Text-only history (no tool call pairs) — simple and reliable
  const history = (session.sessionDataJson?.aiHistory || []).slice(-MAX_HISTORY);

  // Build messages: history + current user message
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  let responseText = null;
  let checkoutTriggered = false;

  try {
    // Agentic loop
    for (let turn = 0; turn < MAX_LOOP; turn += 1) {
      // eslint-disable-next-line no-await-in-loop
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text');
        responseText = textBlock?.text || null;
        break;
      }

      if (response.stop_reason === 'tool_use') {
        // Append assistant turn (with tool_use blocks) to messages
        messages.push({ role: 'assistant', content: response.content });

        const toolResults = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          const result = executeTool(block.name, block.input, cart, products);
          if (result.action === 'CHECKOUT') checkoutTriggered = true;

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Any other stop reason — break
      break;
    }
  } catch (err) {
    logger.error(`[aiAgentService] Claude API error: ${err.message}`);
    return { text: null, action: null };
  }

  // Build updated text-only history (drop tool call/result pairs)
  const newHistory = [
    ...history,
    { role: 'user', content: userMessage },
    ...(responseText ? [{ role: 'assistant', content: responseText }] : []),
  ].slice(-MAX_HISTORY);

  logger.info(`[aiAgentService] Agent responded for ${customer.whatsappNumber}: "${responseText?.slice(0, 60)}"`);

  return {
    text: responseText,
    action: checkoutTriggered ? 'CHECKOUT' : null,
    cart,
    aiHistory: newHistory,
  };
};

export default { isConfigured, runAiAgent };
