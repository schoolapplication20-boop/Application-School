import { Op } from 'sequelize';
import {
  sequelize, Category, Product, ProductAddon, Order, OrderItem, Notification,
} from '../models/index.js';
import * as whatsappService from './whatsappService.js';
import * as chatSessionService from './chatSessionService.js';
import * as paymentService from './paymentService.js';
import logger from '../utils/logger.js';
import {
  SESSION_STATES, ORDER_STATUS, DELIVERY_TYPES, PAYMENT_METHODS, PAYMENT_STATUS, NOTIFICATION_TYPES,
} from '../utils/constants.js';

const PAYMENT_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Cash on delivery/pickup',
  [PAYMENT_METHODS.CARD]: 'Card on delivery/pickup',
  [PAYMENT_METHODS.ONLINE]: 'Online payment (Razorpay)',
  [PAYMENT_METHODS.RAZORPAY]: 'Online payment (Razorpay)',
  [PAYMENT_METHODS.UPI]: 'UPI',
};

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(100 + Math.random() * 900);
  return `ORD-${timestamp}-${random}`;
};

const createOrderWithRetry = async (orderData, transaction, attempts = 3) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await Order.create({ ...orderData, orderNumber: generateOrderNumber() }, { transaction });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError' && attempt < attempts - 1) {
        continue; // eslint-disable-line no-continue
      }
      throw error;
    }
  }
  throw new Error('Failed to generate a unique order number');
};

const getReplyId = (message) => {
  if (message.type === 'interactive') {
    return message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || null;
  }
  if (message.type === 'button') {
    return message.button?.payload || null;
  }
  return null;
};

const saveSession = async (session, updates) => {
  Object.assign(session, updates);
  await session.save();
};

// ============================================
// State handlers
// ============================================

const showMainMenu = async (business, config, customer, session) => {
  const categories = await Category.findAll({
    where: { businessId: business.businessId, isActive: true },
    order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
    limit: 10,
  });

  if (categories.length === 0) {
    await whatsappService.sendTextMessage(
      config,
      customer.whatsappNumber,
      `Welcome to ${business.businessName}! Our menu isn't available yet — please check back soon.`,
    );
    await saveSession(session, { sessionState: SESSION_STATES.MENU });
    return;
  }

  const sections = [{
    title: 'Categories',
    rows: categories.map((category) => ({
      id: `cat_${category.categoryId}`,
      title: category.categoryName,
    })),
  }];

  await whatsappService.sendListMessage(
    config,
    customer.whatsappNumber,
    `Welcome to ${business.businessName}! 👋\n\nBrowse our menu and place your order right here on WhatsApp.`,
    'View Menu',
    sections,
    business.businessName,
  );

  await saveSession(session, { sessionState: SESSION_STATES.MENU });
};

const handleCategorySelection = async (business, config, customer, session, categoryId) => {
  const category = await Category.findOne({
    where: { categoryId, businessId: business.businessId, isActive: true },
  });

  if (!category) {
    await whatsappService.sendTextMessage(config, customer.whatsappNumber, 'Sorry, that category is no longer available.');
    await showMainMenu(business, config, customer, session);
    return;
  }

  const products = await Product.findAll({
    where: { categoryId, businessId: business.businessId, isAvailable: true },
    order: [['createdAt', 'ASC']],
    limit: 9,
  });

  if (products.length === 0) {
    await whatsappService.sendButtonsMessage(
      config,
      customer.whatsappNumber,
      `Sorry, there are no items available in *${category.categoryName}* right now.`,
      [{ id: 'menu', title: '⬅️ Back to Menu' }],
    );
    await saveSession(session, { sessionState: SESSION_STATES.CATEGORY_VIEW, sessionDataJson: { ...session.sessionDataJson, currentCategoryId: categoryId } });
    return;
  }

  const rows = products.map((product) => ({
    id: `prod_${product.productId}`,
    title: product.productName,
    description: product.description ? `${formatMoney(product.price)} - ${product.description}` : formatMoney(product.price),
  }));
  rows.push({ id: 'menu', title: '⬅️ Back to Menu' });

  await whatsappService.sendListMessage(
    config,
    customer.whatsappNumber,
    `Here's what we have in *${category.categoryName}*:`,
    'View Items',
    [{ title: category.categoryName, rows }],
    category.categoryName,
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.CATEGORY_VIEW,
    sessionDataJson: { ...session.sessionDataJson, currentCategoryId: categoryId },
  });
};

const handleProductSelection = async (business, config, customer, session, productId) => {
  const product = await Product.findOne({
    where: { productId, businessId: business.businessId, isAvailable: true },
    include: [{ model: ProductAddon, as: 'addons' }],
  });

  if (!product) {
    await whatsappService.sendTextMessage(config, customer.whatsappNumber, 'Sorry, that item is no longer available.');
    await showMainMenu(business, config, customer, session);
    return;
  }

  const lines = [`*${product.productName}*`];
  if (product.description) lines.push(product.description);
  lines.push(`Price: ${formatMoney(product.price)}`);

  if (product.addons?.length) {
    lines.push('', 'Available add-ons:');
    product.addons.forEach((addon) => {
      lines.push(`• ${addon.addonName} (+${formatMoney(addon.addonPrice)})`);
    });
  }

  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    lines.join('\n'),
    [
      { id: `add_${product.productId}`, title: '🛒 Add to Cart' },
      { id: 'menu', title: '⬅️ Back to Menu' },
      { id: 'view_cart', title: '🛍️ View Cart' },
    ],
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.PRODUCT_VIEW,
    sessionDataJson: { ...session.sessionDataJson, currentProductId: productId },
  });
};

const handleAddToCart = async (business, config, customer, session, productId) => {
  const product = await Product.findOne({
    where: { productId, businessId: business.businessId, isAvailable: true },
  });

  if (!product) {
    await whatsappService.sendTextMessage(config, customer.whatsappNumber, 'Sorry, that item is no longer available.');
    await showMainMenu(business, config, customer, session);
    return;
  }

  const cart = [...(session.sessionDataJson?.cart || [])];
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += 1;
    existing.totalPrice = Number(existing.unitPrice) * existing.quantity;
  } else {
    cart.push({
      productId: product.productId,
      productName: product.productName,
      unitPrice: Number(product.price),
      quantity: 1,
      totalPrice: Number(product.price),
    });
  }

  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    `${product.productName} added to your cart! 🛒`,
    [
      { id: 'checkout', title: '✅ Checkout' },
      { id: 'menu', title: '🍽️ Add More' },
      { id: 'view_cart', title: '🛍️ View Cart' },
    ],
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.CART,
    sessionDataJson: { ...session.sessionDataJson, cart },
  });
};

const handleViewCart = async (business, config, customer, session) => {
  const cart = session.sessionDataJson?.cart || [];

  if (cart.length === 0) {
    await whatsappService.sendButtonsMessage(
      config,
      customer.whatsappNumber,
      'Your cart is empty. Browse our menu to get started!',
      [{ id: 'menu', title: '🍽️ Browse Menu' }],
    );
    await saveSession(session, { sessionState: SESSION_STATES.MENU });
    return;
  }

  const lines = cart.map((item, index) => `${index + 1}. ${item.productName} x${item.quantity} - ${formatMoney(item.totalPrice)}`);
  const total = cart.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  lines.push('', `*Total: ${formatMoney(total)}*`);

  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    lines.join('\n'),
    [
      { id: 'checkout', title: '✅ Checkout' },
      { id: 'menu', title: '🍽️ Add More' },
      { id: 'clear_cart', title: '🗑️ Clear Cart' },
    ],
  );

  await saveSession(session, { sessionState: SESSION_STATES.CART });
};

const handleClearCart = async (business, config, customer, session) => {
  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    'Your cart has been cleared.',
    [{ id: 'menu', title: '🍽️ Browse Menu' }],
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.MENU,
    sessionDataJson: { ...session.sessionDataJson, cart: [] },
  });
};

const handleCheckoutStart = async (business, config, customer, session) => {
  const cart = session.sessionDataJson?.cart || [];

  if (cart.length === 0) {
    await handleViewCart(business, config, customer, session);
    return;
  }

  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    'How would you like to receive your order?',
    [
      { id: `delivery_${DELIVERY_TYPES.DELIVERY}`, title: '🚚 Delivery' },
      { id: `delivery_${DELIVERY_TYPES.PICKUP}`, title: '🏃 Pickup' },
    ],
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.CHECKOUT,
    sessionDataJson: { ...session.sessionDataJson, checkout: {} },
  });
};

const promptPaymentMethod = async (business, config, customer, session) => {
  const rows = Object.entries(PAYMENT_LABELS).map(([method, label]) => ({
    id: `pay_${method}`,
    title: label,
  }));

  await whatsappService.sendListMessage(
    config,
    customer.whatsappNumber,
    'How would you like to pay?',
    'Select Payment',
    [{ title: 'Payment Method', rows }],
  );

  await saveSession(session, {
    sessionDataJson: {
      ...session.sessionDataJson,
      checkout: { ...session.sessionDataJson.checkout, awaiting: 'payment' },
    },
  });
};

const handleDeliveryTypeSelection = async (business, config, customer, session, deliveryType) => {
  if (!Object.values(DELIVERY_TYPES).includes(deliveryType) || session.sessionState !== SESSION_STATES.CHECKOUT) {
    await sendHelp(business, config, customer); // eslint-disable-line no-use-before-define
    return;
  }

  const checkout = { ...session.sessionDataJson.checkout, deliveryType };

  if (deliveryType === DELIVERY_TYPES.DELIVERY) {
    checkout.awaiting = 'address';
    await saveSession(session, { sessionDataJson: { ...session.sessionDataJson, checkout } });
    await whatsappService.sendTextMessage(
      config,
      customer.whatsappNumber,
      'Please type your delivery address.',
    );
    return;
  }

  checkout.deliveryAddress = null;
  await saveSession(session, { sessionDataJson: { ...session.sessionDataJson, checkout } });
  await promptPaymentMethod(business, config, customer, session);
};

const handleAddressInput = async (business, config, customer, session, address) => {
  const checkout = { ...session.sessionDataJson.checkout, deliveryAddress: address, awaiting: null };
  await saveSession(session, { sessionDataJson: { ...session.sessionDataJson, checkout } });
  await promptPaymentMethod(business, config, customer, session);
};

const handlePaymentMethodSelection = async (business, config, customer, session, method) => {
  if (!Object.values(PAYMENT_METHODS).includes(method) || session.sessionState !== SESSION_STATES.CHECKOUT) {
    await sendHelp(business, config, customer); // eslint-disable-line no-use-before-define
    return;
  }

  const checkout = { ...session.sessionDataJson.checkout, paymentMethod: method, awaiting: 'confirm' };
  await saveSession(session, { sessionDataJson: { ...session.sessionDataJson, checkout } });

  const cart = session.sessionDataJson?.cart || [];
  const estimatedTotal = cart.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  const lines = ['*Order Summary*', ...cart.map((item) => `${item.quantity}x ${item.productName} - ${formatMoney(item.totalPrice)}`)];
  lines.push('', `Delivery: ${checkout.deliveryType}`);
  if (checkout.deliveryAddress) lines.push(`Address: ${checkout.deliveryAddress}`);
  lines.push(`Payment: ${PAYMENT_LABELS[method]}`);
  lines.push('', `*Estimated Total: ${formatMoney(estimatedTotal)}*`, '(taxes/fees calculated on confirmation)');

  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    lines.join('\n'),
    [
      { id: 'confirm_order', title: '✅ Confirm Order' },
      { id: 'cancel_checkout', title: '❌ Cancel' },
    ],
  );
};

const handleCancelCheckout = async (business, config, customer, session) => {
  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    'Checkout cancelled. Your cart has been saved.',
    [
      { id: 'view_cart', title: '🛍️ View Cart' },
      { id: 'menu', title: '🍽️ Browse Menu' },
    ],
  );

  await saveSession(session, {
    sessionState: SESSION_STATES.CART,
    sessionDataJson: { ...session.sessionDataJson, checkout: {} },
  });
};

const handleConfirmOrder = async (business, config, customer, session) => {
  const cart = session.sessionDataJson?.cart || [];
  const checkout = session.sessionDataJson?.checkout || {};

  if (cart.length === 0 || !checkout.deliveryType || !checkout.paymentMethod) {
    await whatsappService.sendTextMessage(config, customer.whatsappNumber, 'Something went wrong with your order. Let\'s start again.');
    await showMainMenu(business, config, customer, session);
    return;
  }

  const products = await Product.findAll({
    where: { businessId: business.businessId, productId: { [Op.in]: cart.map((item) => item.productId) } },
  });

  let subtotal = 0;
  let taxAmount = 0;
  const itemsData = [];

  cart.forEach((item) => {
    const product = products.find((p) => p.productId === item.productId);
    if (!product) return;

    const lineTotal = Number(product.price) * item.quantity;
    const lineTax = lineTotal * (Number(product.taxPercentage || 0) / 100);

    subtotal += lineTotal;
    taxAmount += lineTax;

    itemsData.push({
      productId: product.productId,
      productName: product.productName,
      quantity: item.quantity,
      unitPrice: product.price,
      totalPrice: lineTotal,
    });
  });

  if (itemsData.length === 0) {
    await whatsappService.sendTextMessage(config, customer.whatsappNumber, 'Sorry, the items in your cart are no longer available.');
    await chatSessionService.resetSession(session);
    await showMainMenu(business, config, customer, session);
    return;
  }

  const deliveryFee = 0;
  const totalAmount = subtotal + taxAmount + deliveryFee;

  const order = await sequelize.transaction(async (transaction) => {
    const newOrder = await createOrderWithRetry({
      businessId: business.businessId,
      customerId: customer.customerId,
      status: ORDER_STATUS.PENDING,
      subtotal,
      taxAmount,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      deliveryType: checkout.deliveryType,
      deliveryAddress: checkout.deliveryType === DELIVERY_TYPES.DELIVERY ? checkout.deliveryAddress : null,
      paymentMethod: checkout.paymentMethod,
      paymentStatus: PAYMENT_STATUS.PENDING,
    }, transaction);

    await OrderItem.bulkCreate(itemsData.map((item) => ({
      orderId: newOrder.orderId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })), { transaction });

    customer.totalOrders = (customer.totalOrders || 0) + 1;
    customer.totalSpent = Number(customer.totalSpent || 0) + totalAmount;
    customer.lastOrderAt = new Date();
    await customer.save({ transaction });

    await Notification.create({
      businessId: business.businessId,
      notificationType: NOTIFICATION_TYPES.NEW_ORDER,
      title: 'New order received',
      message: `${customer.customerName || customer.whatsappNumber} placed order ${newOrder.orderNumber} for ${formatMoney(totalAmount)}`,
    }, { transaction });

    return newOrder;
  });

  // Generate payment link for online payment methods
  let paymentLinkUrl = null;
  if (paymentService.isOnlinePayment(checkout.paymentMethod)) {
    try {
      const linkData = await paymentService.createPaymentLink(order, business, customer);
      if (linkData) {
        paymentLinkUrl = linkData.paymentLinkUrl;
        await order.update({
          paymentLinkId:  linkData.paymentLinkId,
          paymentLinkUrl: linkData.paymentLinkUrl,
        });
        logger.info(`[conversationService] Payment link sent for order ${order.orderNumber}`);
      }
    } catch (err) {
      logger.error(`[conversationService] Payment link creation failed for ${order.orderNumber}: ${err.message}`);
    }
  }

  const confirmationLines = [
    '🎉 *Order placed successfully!*',
    '',
    `Order #: ${order.orderNumber}`,
    ...itemsData.map((item) => `${item.quantity}x ${item.productName} — ${formatMoney(item.totalPrice)}`),
    '',
    `Subtotal: ${formatMoney(subtotal)}`,
    `Tax: ${formatMoney(taxAmount)}`,
    `*Total: ${formatMoney(totalAmount)}*`,
    `Payment: ${PAYMENT_LABELS[checkout.paymentMethod] || checkout.paymentMethod}`,
  ];

  if (paymentLinkUrl) {
    confirmationLines.push(
      '',
      '💳 *Complete your payment to confirm your order:*',
      paymentLinkUrl,
      '',
      '⚠️ Link expires in 24 hours. Your order will be prepared once payment is received.',
    );
  } else {
    confirmationLines.push(
      '',
      `${business.businessName} has received your order and will confirm it shortly. 🙏`,
    );
  }

  await whatsappService.sendTextMessage(config, customer.whatsappNumber, confirmationLines.join('\n'));
  await chatSessionService.resetSession(session);
};

const sendHelp = async (business, config, customer) => {
  await whatsappService.sendButtonsMessage(
    config,
    customer.whatsappNumber,
    'Hi! I didn\'t quite get that. Here\'s what you can do:',
    [
      { id: 'menu', title: '🍽️ View Menu' },
      { id: 'view_cart', title: '🛍️ View Cart' },
    ],
  );
};

// ============================================
// Entry point
// ============================================

export const handleIncomingMessage = async ({
  business, config, customer, session, message,
}) => {
  await chatSessionService.touchSession(session);

  const replyId = getReplyId(message);
  const text = message.type === 'text' ? message.text?.body?.trim() : null;
  const normalizedText = text?.toLowerCase();
  const greetings = ['hi', 'hello', 'hey', 'menu', 'start'];

  try {
    if (replyId === 'menu' || (normalizedText && greetings.includes(normalizedText))) {
      return await showMainMenu(business, config, customer, session);
    }
    if (replyId === 'view_cart' || normalizedText === 'cart') {
      return await handleViewCart(business, config, customer, session);
    }
    if (replyId === 'clear_cart') {
      return await handleClearCart(business, config, customer, session);
    }
    if (replyId === 'checkout') {
      return await handleCheckoutStart(business, config, customer, session);
    }
    if (replyId === 'confirm_order') {
      return await handleConfirmOrder(business, config, customer, session);
    }
    if (replyId === 'cancel_checkout') {
      return await handleCancelCheckout(business, config, customer, session);
    }
    if (replyId?.startsWith('cat_')) {
      return await handleCategorySelection(business, config, customer, session, replyId.slice(4));
    }
    if (replyId?.startsWith('prod_')) {
      return await handleProductSelection(business, config, customer, session, replyId.slice(5));
    }
    if (replyId?.startsWith('add_')) {
      return await handleAddToCart(business, config, customer, session, replyId.slice(4));
    }
    if (replyId?.startsWith('delivery_')) {
      return await handleDeliveryTypeSelection(business, config, customer, session, replyId.slice(9));
    }
    if (replyId?.startsWith('pay_')) {
      return await handlePaymentMethodSelection(business, config, customer, session, replyId.slice(4));
    }

    if (
      text
      && session.sessionState === SESSION_STATES.CHECKOUT
      && session.sessionDataJson?.checkout?.awaiting === 'address'
    ) {
      return await handleAddressInput(business, config, customer, session, text);
    }

    return await sendHelp(business, config, customer);
  } catch (error) {
    logger.error(`Conversation handling error for business ${business.businessId}: ${error.message}`);
    return whatsappService.sendTextMessage(
      config,
      customer.whatsappNumber,
      'Sorry, something went wrong on our end. Please try again in a moment.',
    );
  }
};

export default { handleIncomingMessage };
