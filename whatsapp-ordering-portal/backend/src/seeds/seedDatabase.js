import dotenv from 'dotenv';
import {
  sequelize, User, Business, Category, Product, ProductAddon, Customer, Order, OrderItem,
} from '../models/index.js';
import { hashPassword } from '../utils/crypto.js';
import {
  BUSINESS_TYPES, ORDER_STATUS, DELIVERY_TYPES, PAYMENT_METHODS, PAYMENT_STATUS,
} from '../utils/constants.js';

dotenv.config();

const DEMO_USER_EMAIL = 'demo@whatsappportal.com';
const DEMO_USER_PASSWORD = 'Demo@1234';

const seedUser = async () => {
  const [user] = await User.findOrCreate({
    where: { email: DEMO_USER_EMAIL },
    defaults: {
      email: DEMO_USER_EMAIL,
      passwordHash: await hashPassword(DEMO_USER_PASSWORD),
      fullName: 'Demo Owner',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✓ User ready: ${user.email}`);
  return user;
};

const seedBusiness = async (user) => {
  const [business] = await Business.findOrCreate({
    where: { userId: user.userId, businessName: 'Demo Restaurant' },
    defaults: {
      userId: user.userId,
      businessName: 'Demo Restaurant',
      businessType: BUSINESS_TYPES.RESTAURANT,
      address: '123 MG Road',
      city: 'Bangalore',
      postalCode: '560001',
      phoneNumber: '+919876543210',
      whatsappNumber: '+919876543210',
    },
  });

  console.log(`✓ Business ready: ${business.businessName}`);
  return business;
};

const SEED_CATEGORIES = [
  { categoryName: 'Starters', displayOrder: 1 },
  { categoryName: 'Main Course', displayOrder: 2 },
  { categoryName: 'Desserts', displayOrder: 3 },
  { categoryName: 'Beverages', displayOrder: 4 },
];

const SEED_PRODUCTS = {
  Starters: [
    {
      productName: 'Paneer Tikka', description: 'Grilled cottage cheese with spices', price: 220, taxPercentage: 5,
    },
    {
      productName: 'Veg Spring Rolls', description: 'Crispy rolls with mixed vegetables', price: 180, taxPercentage: 5,
    },
  ],
  'Main Course': [
    {
      productName: 'Butter Chicken',
      description: 'Creamy tomato-based curry with tender chicken',
      price: 350,
      taxPercentage: 5,
      addons: [{ addonName: 'Extra Gravy', addonPrice: 50 }, { addonName: 'Butter Naan', addonPrice: 40 }],
    },
    {
      productName: 'Veg Biryani',
      description: 'Fragrant basmati rice with mixed vegetables and spices',
      price: 280,
      taxPercentage: 5,
      addons: [{ addonName: 'Raita', addonPrice: 30 }],
    },
  ],
  Desserts: [
    {
      productName: 'Gulab Jamun', description: 'Soft milk dumplings in sugar syrup', price: 90, taxPercentage: 5,
    },
  ],
  Beverages: [
    {
      productName: 'Masala Chai', description: 'Traditional spiced Indian tea', price: 40, taxPercentage: 5,
    },
    {
      productName: 'Fresh Lime Soda', description: 'Refreshing lime soda', price: 60, taxPercentage: 5,
    },
  ],
};

const seedCatalog = async (business) => {
  const productsByName = {};

  for (const categoryDef of SEED_CATEGORIES) {
    const [category] = await Category.findOrCreate({
      where: { businessId: business.businessId, categoryName: categoryDef.categoryName },
      defaults: {
        businessId: business.businessId,
        categoryName: categoryDef.categoryName,
        displayOrder: categoryDef.displayOrder,
        isActive: true,
      },
    });

    for (const productDef of SEED_PRODUCTS[categoryDef.categoryName] || []) {
      const [product] = await Product.findOrCreate({
        where: { businessId: business.businessId, categoryId: category.categoryId, productName: productDef.productName },
        defaults: {
          businessId: business.businessId,
          categoryId: category.categoryId,
          productName: productDef.productName,
          description: productDef.description,
          price: productDef.price,
          taxPercentage: productDef.taxPercentage,
          isAvailable: true,
        },
      });

      productsByName[product.productName] = product;

      for (const addonDef of productDef.addons || []) {
        await ProductAddon.findOrCreate({
          where: { productId: product.productId, addonName: addonDef.addonName },
          defaults: {
            productId: product.productId,
            addonName: addonDef.addonName,
            addonPrice: addonDef.addonPrice,
            isRequired: false,
          },
        });
      }
    }

    console.log(`✓ Category ready: ${category.categoryName}`);
  }

  return productsByName;
};

const seedCustomerAndOrder = async (business, productsByName) => {
  const [customer] = await Customer.findOrCreate({
    where: { businessId: business.businessId, whatsappNumber: '+919812345678' },
    defaults: {
      businessId: business.businessId,
      whatsappNumber: '+919812345678',
      customerName: 'Test Customer',
      phoneNumber: '+919812345678',
      address: '456 Brigade Road, Bangalore',
    },
  });

  console.log(`✓ Customer ready: ${customer.customerName}`);

  const existingOrder = await Order.findOne({ where: { businessId: business.businessId, customerId: customer.customerId } });
  if (existingOrder) {
    console.log('✓ Sample order already exists');
    return;
  }

  const butterChicken = productsByName['Butter Chicken'];
  const masalaChai = productsByName['Masala Chai'];

  const items = [
    { product: butterChicken, quantity: 1 },
    { product: masalaChai, quantity: 2 },
  ].filter((item) => item.product);

  const subtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const taxAmount = items.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity * Number(item.product.taxPercentage || 0)) / 100, 0);
  const totalAmount = subtotal + taxAmount;

  const order = await sequelize.transaction(async (transaction) => {
    const newOrder = await Order.create({
      businessId: business.businessId,
      customerId: customer.customerId,
      orderNumber: `ORD-DEMO-${Date.now().toString(36).toUpperCase()}`,
      status: ORDER_STATUS.PENDING,
      subtotal,
      taxAmount,
      deliveryFee: 0,
      discountAmount: 0,
      totalAmount,
      deliveryType: DELIVERY_TYPES.DELIVERY,
      deliveryAddress: customer.address,
      paymentMethod: PAYMENT_METHODS.CASH,
      paymentStatus: PAYMENT_STATUS.PENDING,
    }, { transaction });

    await OrderItem.bulkCreate(items.map((item) => ({
      orderId: newOrder.orderId,
      productId: item.product.productId,
      productName: item.product.productName,
      quantity: item.quantity,
      unitPrice: item.product.price,
      totalPrice: Number(item.product.price) * item.quantity,
    })), { transaction });

    customer.totalOrders = 1;
    customer.totalSpent = totalAmount;
    customer.lastOrderAt = new Date();
    await customer.save({ transaction });

    return newOrder;
  });

  console.log(`✓ Sample order created: ${order.orderNumber}`);
};

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    const user = await seedUser();
    const business = await seedBusiness(user);
    const productsByName = await seedCatalog(business);
    await seedCustomerAndOrder(business, productsByName);

    console.log('\n✅ Database seeded successfully!');
    console.log(`   Login with: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
