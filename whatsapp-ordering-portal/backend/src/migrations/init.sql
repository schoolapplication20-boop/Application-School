-- ============================================
-- WhatsApp Ordering Portal - Database Schema
-- ============================================
-- All objects are schema-qualified (whatsapp_portal.wa_*) so this script is
-- safe to run with statement-by-statement execution (no reliance on
-- search_path, which is not guaranteed to persist across pooled connections).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS whatsapp_portal;

-- ============================================
-- Users Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_users_email ON whatsapp_portal.wa_users(email);
CREATE INDEX IF NOT EXISTS idx_wa_users_created_at ON whatsapp_portal.wa_users(created_at);

-- ============================================
-- OTP Tokens Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_otp_tokens (
  otp_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES whatsapp_portal.wa_users(user_id) ON DELETE CASCADE,
  otp_code VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_otp_tokens_user_id ON whatsapp_portal.wa_otp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_otp_tokens_expires_at ON whatsapp_portal.wa_otp_tokens(expires_at);

-- ============================================
-- Email Verification Tokens Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_email_verification_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES whatsapp_portal.wa_users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_email_verification_tokens_user_id ON whatsapp_portal.wa_email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_email_verification_tokens_expires_at ON whatsapp_portal.wa_email_verification_tokens(expires_at);

-- ============================================
-- Sessions Table (audit trail of logins)
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES whatsapp_portal.wa_users(user_id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_user_id ON whatsapp_portal.wa_sessions(user_id);

-- ============================================
-- Businesses Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_businesses (
  business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES whatsapp_portal.wa_users(user_id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  logo_url VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  phone_number VARCHAR(20),
  whatsapp_number VARCHAR(20) UNIQUE,
  website_url VARCHAR(500),
  business_hours_json JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_status VARCHAR(50) DEFAULT 'TRIAL',
  subscription_tier VARCHAR(50) DEFAULT 'BASIC',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_businesses_user_id ON whatsapp_portal.wa_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_businesses_whatsapp_number ON whatsapp_portal.wa_businesses(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_wa_businesses_is_active ON whatsapp_portal.wa_businesses(is_active);

-- ============================================
-- WhatsApp Configuration Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_whatsapp_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  whatsapp_business_account_id VARCHAR(255),
  phone_number_id VARCHAR(255),
  access_token VARCHAR(1000),
  webhook_url VARCHAR(500),
  webhook_verify_token VARCHAR(255),
  is_configured BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_whatsapp_config_business_id ON whatsapp_portal.wa_whatsapp_config(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_whatsapp_config_phone_number_id ON whatsapp_portal.wa_whatsapp_config(phone_number_id);

-- ============================================
-- Product Categories Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  icon_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_categories_business_id ON whatsapp_portal.wa_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_categories_display_order ON whatsapp_portal.wa_categories(display_order);

-- ============================================
-- Products Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_products (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES whatsapp_portal.wa_categories(category_id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  preparation_time_minutes INTEGER,
  tags VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_products_business_id ON whatsapp_portal.wa_products(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_products_category_id ON whatsapp_portal.wa_products(category_id);
CREATE INDEX IF NOT EXISTS idx_wa_products_is_available ON whatsapp_portal.wa_products(is_available);
CREATE INDEX IF NOT EXISTS idx_wa_products_business_category ON whatsapp_portal.wa_products(business_id, category_id);

-- ============================================
-- Product Add-ons Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_product_addons (
  addon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES whatsapp_portal.wa_products(product_id) ON DELETE CASCADE,
  addon_name VARCHAR(255) NOT NULL,
  addon_price DECIMAL(10, 2) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_product_addons_product_id ON whatsapp_portal.wa_product_addons(product_id);

-- ============================================
-- Customers Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  whatsapp_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  delivery_location_lat DECIMAL(10, 8),
  delivery_location_lng DECIMAL(11, 8),
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_order_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, whatsapp_number)
);

CREATE INDEX IF NOT EXISTS idx_wa_customers_business_id ON whatsapp_portal.wa_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_customers_whatsapp_number ON whatsapp_portal.wa_customers(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_wa_customers_business_created ON whatsapp_portal.wa_customers(business_id, created_at DESC);

-- ============================================
-- Orders Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES whatsapp_portal.wa_customers(customer_id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  whatsapp_message_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  delivery_fee DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  delivery_type VARCHAR(50),
  delivery_address TEXT,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(business_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_wa_orders_business_id ON whatsapp_portal.wa_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_orders_customer_id ON whatsapp_portal.wa_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_orders_status ON whatsapp_portal.wa_orders(status);
CREATE INDEX IF NOT EXISTS idx_wa_orders_order_number ON whatsapp_portal.wa_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_wa_orders_created_at ON whatsapp_portal.wa_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_orders_business_created ON whatsapp_portal.wa_orders(business_id, created_at DESC);

-- ============================================
-- Order Items Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_order_items (
  order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES whatsapp_portal.wa_orders(order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES whatsapp_portal.wa_products(product_id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  addons_json JSONB,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_order_items_order_id ON whatsapp_portal.wa_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wa_order_items_product_id ON whatsapp_portal.wa_order_items(product_id);

-- ============================================
-- WhatsApp Chat Sessions Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_chat_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES whatsapp_portal.wa_customers(customer_id) ON DELETE CASCADE,
  order_id UUID REFERENCES whatsapp_portal.wa_orders(order_id) ON DELETE SET NULL,
  session_state VARCHAR(50) DEFAULT 'MENU',
  session_data_json JSONB,
  last_message_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_chat_sessions_business_id ON whatsapp_portal.wa_chat_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_chat_sessions_customer_id ON whatsapp_portal.wa_chat_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_chat_sessions_is_active ON whatsapp_portal.wa_chat_sessions(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_chat_sessions_active_customer ON whatsapp_portal.wa_chat_sessions(business_id, customer_id) WHERE is_active = TRUE;

-- ============================================
-- Audit Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE SET NULL,
  user_id UUID REFERENCES whatsapp_portal.wa_users(user_id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_business_id ON whatsapp_portal.wa_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_user_id ON whatsapp_portal.wa_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_action ON whatsapp_portal.wa_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_wa_audit_logs_created_at ON whatsapp_portal.wa_audit_logs(created_at);

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_notifications_business_id ON whatsapp_portal.wa_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_notifications_is_read ON whatsapp_portal.wa_notifications(is_read);

-- ============================================
-- Message Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_portal.wa_message_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES whatsapp_portal.wa_businesses(business_id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_body TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_message_templates_business_id ON whatsapp_portal.wa_message_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_wa_message_templates_template_type ON whatsapp_portal.wa_message_templates(template_type);

-- Grant permissions (if using separate user)
-- GRANT ALL PRIVILEGES ON SCHEMA whatsapp_portal TO whatsapp_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA whatsapp_portal TO whatsapp_user;

-- ── Column additions (idempotent via IF NOT EXISTS) ───────────────────────────
ALTER TABLE wa_businesses ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}';
ALTER TABLE wa_businesses ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE wa_products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE;
ALTER TABLE wa_products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

ALTER TABLE wa_orders ADD COLUMN IF NOT EXISTS payment_link_id VARCHAR(255);
ALTER TABLE wa_orders ADD COLUMN IF NOT EXISTS payment_link_url VARCHAR(500);
ALTER TABLE wa_orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_wa_orders_payment_link_id ON wa_orders(payment_link_id) WHERE payment_link_id IS NOT NULL;

-- The Category and Customer Sequelize models are paranoid (soft-delete), which
-- requires a deleted_at column. It was missing from both tables' original
-- CREATE TABLE statements above, causing every insert/query to fail with a
-- generic 500 ("column deleted_at does not exist").
ALTER TABLE wa_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE wa_customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
