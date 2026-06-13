# WhatsApp Ordering Portal - Architecture & Implementation Plan

**Document Status:** Architecture Planning Phase  
**Last Updated:** 2026-06-12  
**Module:** WhatsApp Ordering Portal (Separate Module)  
**Isolation Level:** Complete - No modifications to existing my-skoolz application

---

## 1. EXECUTIVE SUMMARY

The WhatsApp Ordering Portal is a **production-ready SaaS platform** enabling restaurants, grocery stores, cafes, and retail shops to receive and manage orders via WhatsApp. It operates as a completely separate module while safely reusing existing infrastructure.

### Key Attributes
- ✅ **Isolated Deployment:** Independently deployable and scalable
- ✅ **Multi-Tenant:** Supports unlimited businesses with data isolation
- ✅ **Secure:** Enterprise-grade authentication and data protection
- ✅ **Production-Ready:** Docker, monitoring, logging, error handling
- ✅ **SaaS-Ready:** Premium UI/UX, subscription model compatible
- ✅ **Zero Breaking Changes:** No modifications to existing my-skoolz application

---

## 2. ARCHITECTURE OVERVIEW

### 2.1 Module Structure

```
/my-skoolz (git repository root)
├── /existing-app                    [DO NOT TOUCH]
│   ├── client/                      (React + Vite)
│   ├── server/                      (Spring Boot)
│   └── mobile/                      (React Native)
│
└── /whatsapp-ordering-portal        [NEW MODULE]
    ├── backend/                     (Node.js + Express)
    ├── frontend/                    (React 18 + Vite)
    ├── docker/                      (Dockerfile, docker-compose)
    ├── docs/                        (API docs, deployment guides)
    ├── .env.example                 (Environment template)
    ├── .gitignore                   (Module-specific)
    └── README.md                    (Setup instructions)
```

### 2.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend** | Node.js 18+ + Express | Separate from Spring Boot, fast API dev, JSON-native |
| **Frontend** | React 18 + Vite | Consistent with existing, modern SaaS UX |
| **Database** | PostgreSQL (separate schema) | Reuses existing DB server, isolated with `wa_` prefix |
| **Real-time** | Socket.io + Redis | Separate Redis instance, real-time notifications |
| **Auth** | JWT + OTP | Secure, stateless, independent of my-skoolz auth |
| **File Storage** | AWS S3 or MinIO | Object storage for logos, menus, documents |
| **WhatsApp API** | Meta Cloud API or Twilio | Industry standard, managed service |
| **Email** | SMTP (existing or separate) | OTP, notifications, order confirmations |
| **Logging** | Winston + ELK Stack | Centralized logging, monitoring |
| **Containerization** | Docker + Docker Compose | Separate deployable unit |
| **CI/CD** | Existing pipeline with new workflow | GitHub Actions or Jenkins |

---

## 3. DATABASE SCHEMA (PostgreSQL)

### 3.1 Database Namespace Strategy

**Schema Name:** `whatsapp_portal` (completely isolated)  
**Table Prefix:** `wa_` (additional safety)  
**Naming Pattern:** `whatsapp_portal.wa_<table_name>`

### 3.2 Core Tables

#### Authentication & Users
```sql
-- Users/Business Owners
whatsapp_portal.wa_users
- user_id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR, bcrypt)
- full_name (VARCHAR)
- is_email_verified (BOOLEAN)
- email_verified_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP)

-- OTP Verification
whatsapp_portal.wa_otp_tokens
- otp_id (UUID, PK)
- user_id (UUID, FK)
- otp_code (VARCHAR, hashed)
- purpose (ENUM: LOGIN, SIGNUP, PASSWORD_RESET)
- is_used (BOOLEAN)
- used_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)

-- Email Verification Tokens
whatsapp_portal.wa_email_verification_tokens
- token_id (UUID, PK)
- user_id (UUID, FK)
- token (VARCHAR, hashed)
- expires_at (TIMESTAMP)
- used_at (TIMESTAMP)
- created_at (TIMESTAMP)

-- Sessions (Optional: for audit trail)
whatsapp_portal.wa_sessions
- session_id (UUID, PK)
- user_id (UUID, FK)
- token (VARCHAR)
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- login_at (TIMESTAMP)
- last_activity_at (TIMESTAMP)
- logout_at (TIMESTAMP)
```

#### Business Data
```sql
-- Businesses
whatsapp_portal.wa_businesses
- business_id (UUID, PK)
- user_id (UUID, FK)
- business_name (VARCHAR)
- business_type (ENUM: RESTAURANT, CAFE, GROCERY, RETAIL, OTHER)
- logo_url (VARCHAR)
- address (TEXT)
- city (VARCHAR)
- postal_code (VARCHAR)
- phone_number (VARCHAR)
- whatsapp_number (VARCHAR, unique per business)
- website_url (VARCHAR)
- business_hours_json (JSONB)
- is_active (BOOLEAN)
- subscription_status (ENUM: TRIAL, ACTIVE, SUSPENDED, CANCELED)
- subscription_tier (ENUM: BASIC, PREMIUM, ENTERPRISE)
- subscription_expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- WhatsApp Integration Config
whatsapp_portal.wa_whatsapp_config
- config_id (UUID, PK)
- business_id (UUID, FK)
- whatsapp_business_account_id (VARCHAR)
- phone_number_id (VARCHAR)
- access_token (VARCHAR, encrypted)
- webhook_url (VARCHAR)
- webhook_verify_token (VARCHAR)
- is_configured (BOOLEAN)
- is_verified (BOOLEAN)
- verified_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- WhatsApp Message Templates
whatsapp_portal.wa_message_templates
- template_id (UUID, PK)
- business_id (UUID, FK)
- template_name (VARCHAR)
- template_type (ENUM: GREETING, MENU, ORDER_CONFIRMATION, PAYMENT_REQUEST, FAQ)
- template_body (TEXT)
- variables (JSONB)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### Products & Menus
```sql
-- Product Categories
whatsapp_portal.wa_categories
- category_id (UUID, PK)
- business_id (UUID, FK)
- category_name (VARCHAR)
- display_order (INTEGER)
- icon_url (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)

-- Products/Menu Items
whatsapp_portal.wa_products
- product_id (UUID, PK)
- business_id (UUID, FK)
- category_id (UUID, FK)
- product_name (VARCHAR)
- description (TEXT)
- price (DECIMAL(10, 2))
- image_url (VARCHAR)
- is_available (BOOLEAN)
- stock_quantity (INTEGER)
- tax_percentage (DECIMAL(5, 2))
- preparation_time_minutes (INTEGER)
- tags (VARCHAR[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Product Add-ons/Options
whatsapp_portal.wa_product_addons
- addon_id (UUID, PK)
- product_id (UUID, FK)
- addon_name (VARCHAR)
- addon_price (DECIMAL(10, 2))
- is_required (BOOLEAN)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

#### Orders & Customers
```sql
-- Customers
whatsapp_portal.wa_customers
- customer_id (UUID, PK)
- business_id (UUID, FK)
- whatsapp_number (VARCHAR)
- customer_name (VARCHAR)
- phone_number (VARCHAR)
- email (VARCHAR)
- address (TEXT)
- delivery_location_lat (DECIMAL)
- delivery_location_lng (DECIMAL)
- total_orders (INTEGER)
- total_spent (DECIMAL)
- last_order_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

-- Orders
whatsapp_portal.wa_orders
- order_id (UUID, PK)
- business_id (UUID, FK)
- customer_id (UUID, FK)
- order_number (VARCHAR, unique per business)
- whatsapp_message_id (VARCHAR)
- status (ENUM: CART, PENDING, ACCEPTED, PREPARING, READY, DELIVERED, COMPLETED, CANCELED, REFUNDED)
- subtotal (DECIMAL(10, 2))
- tax_amount (DECIMAL(10, 2))
- delivery_fee (DECIMAL(10, 2))
- discount_amount (DECIMAL(10, 2))
- total_amount (DECIMAL(10, 2))
- delivery_type (ENUM: DELIVERY, PICKUP)
- delivery_address (TEXT)
- payment_method (ENUM: CASH, CARD, ONLINE, UPI)
- payment_status (ENUM: PENDING, COMPLETED, FAILED, REFUNDED)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- completed_at (TIMESTAMP)

-- Order Items
whatsapp_portal.wa_order_items
- order_item_id (UUID, PK)
- order_id (UUID, FK)
- product_id (UUID, FK)
- product_name (VARCHAR)
- quantity (INTEGER)
- unit_price (DECIMAL(10, 2))
- total_price (DECIMAL(10, 2))
- addons_json (JSONB)
- special_instructions (TEXT)
- created_at (TIMESTAMP)

-- WhatsApp Chat Sessions
whatsapp_portal.wa_chat_sessions
- session_id (UUID, PK)
- business_id (UUID, FK)
- customer_id (UUID, FK)
- order_id (UUID, FK, nullable)
- session_state (ENUM: MENU, CATEGORY_VIEW, PRODUCT_VIEW, CART, CHECKOUT, ABANDONED)
- session_data_json (JSONB)
- last_message_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- closed_at (TIMESTAMP)
```

#### Notifications & Audit
```sql
-- Notifications
whatsapp_portal.wa_notifications
- notification_id (UUID, PK)
- business_id (UUID, FK)
- notification_type (ENUM: NEW_ORDER, PAYMENT_RECEIVED, CUSTOMER_MESSAGE, SYSTEM_ALERT)
- title (VARCHAR)
- message (TEXT)
- is_read (BOOLEAN)
- read_at (TIMESTAMP)
- created_at (TIMESTAMP)

-- Audit Logs
whatsapp_portal.wa_audit_logs
- log_id (UUID, PK)
- business_id (UUID, FK, nullable)
- user_id (UUID, FK, nullable)
- action (VARCHAR)
- entity_type (VARCHAR)
- entity_id (VARCHAR)
- changes (JSONB)
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- status (ENUM: SUCCESS, FAILED)
- error_message (TEXT, nullable)
- created_at (TIMESTAMP)
```

### 3.3 Migration Strategy

**Phase 1 (Initial Setup):**
1. Create new schema `whatsapp_portal` in existing PostgreSQL database
2. Run migration scripts to create all tables with `wa_` prefix
3. Add indexes for performance (user_id, business_id, whatsapp_number, etc.)
4. Create views for analytics if needed

**Phase 2 (Production):**
1. Set up automated backups for new schema only
2. Create separate read replicas for reporting if needed
3. Set up proper monitoring and alerting

---

## 4. API ARCHITECTURE

### 4.1 API Structure

```
Backend Entry Point: http://localhost:3000/api/v1

Authentication Endpoints:
  POST   /auth/signup               (Email + Password)
  POST   /auth/verify-email         (Email verification)
  POST   /auth/login                (Email + Password)
  POST   /auth/send-otp             (Send OTP)
  POST   /auth/verify-otp           (Verify OTP for login)
  POST   /auth/logout               (Logout)
  POST   /auth/refresh-token        (Refresh JWT)
  POST   /auth/forgot-password      (Initiate password reset)
  POST   /auth/reset-password       (Complete password reset)

Business Endpoints:
  GET    /businesses/:id            (Get business profile)
  PUT    /businesses/:id            (Update business profile)
  POST   /businesses/whatsapp/setup (Setup WhatsApp config)
  PUT    /businesses/whatsapp/config (Update WhatsApp config)
  GET    /businesses/whatsapp/config (Get WhatsApp config)

Product Endpoints:
  GET    /products/categories       (Get all categories)
  POST   /products/categories       (Create category)
  GET    /products                  (Get products)
  POST   /products                  (Create product)
  PUT    /products/:id              (Update product)
  DELETE /products/:id              (Delete product)

Order Endpoints:
  GET    /orders                    (Get orders list with filters)
  GET    /orders/:id                (Get order details)
  POST   /orders/:id/accept         (Accept order)
  POST   /orders/:id/reject         (Reject order)
  POST   /orders/:id/complete       (Mark as completed)
  POST   /orders/:id/cancel         (Cancel order)

Customer Endpoints:
  GET    /customers                 (Get customers)
  GET    /customers/:id             (Get customer details)

Analytics Endpoints:
  GET    /analytics/dashboard       (Dashboard stats)
  GET    /analytics/sales           (Sales data)
  GET    /analytics/orders          (Order trends)

WhatsApp Webhook:
  POST   /webhooks/whatsapp/messages (Receive incoming messages)
  POST   /webhooks/whatsapp/status   (Receive message status updates)

Admin Endpoints:
  GET    /admin/users               (Manage users)
  GET    /admin/subscriptions       (Manage subscriptions)
```

### 4.2 Request/Response Format

**Standard Request:**
```json
{
  "Authorization": "Bearer <JWT_TOKEN>"
}
```

**Standard Response (Success):**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Standard Response (Error):**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* optional additional info */ }
}
```

---

## 5. AUTHENTICATION FLOW

### 5.1 Signup Flow

```
1. User submits email + password
   ↓
2. Validate input (email format, password strength)
   ↓
3. Check email doesn't exist
   ↓
4. Hash password (bcrypt, 12 rounds)
   ↓
5. Create user record
   ↓
6. Generate email verification token
   ↓
7. Send verification email with link
   ↓
8. Return { user, verification_email_sent: true }
   ↓
9. User clicks email link → verifies email
   ↓
10. Account ready for login
```

### 5.2 Login Flow

```
Step 1: Email + Password
  1. User enters email + password
  2. Find user by email
  3. Verify password against hash
  4. If invalid → return 401
  
Step 2: OTP Generation & Delivery
  1. Generate 6-digit OTP
  2. Hash OTP (never store plaintext)
  3. Set expiry (e.g., 5 minutes)
  4. Send OTP via email
  5. Return { requires_otp: true, otp_delivery_method: "email" }

Step 3: OTP Verification
  1. User submits OTP
  2. Find latest OTP for user
  3. Verify OTP hash matches submitted OTP
  4. Check if expired
  5. Mark OTP as used
  6. Generate JWT token (expires in 24 hours)
  7. Generate refresh token (expires in 30 days)
  8. Create session record for audit trail
  9. Return { access_token, refresh_token, user }
```

### 5.3 Security Measures

```
✓ Passwords: bcrypt with 12 rounds + salt
✓ OTP: 6-digit numeric, hashed before storage
✓ JWT: HS256 signed with secure secret (min 32 characters)
✓ CSRF: Token-based for form submissions
✓ XSS: Context-aware output encoding, Content-Security-Policy headers
✓ SQL Injection: Parameterized queries, ORM-based
✓ Rate Limiting: 5 failed attempts → 15 min lockout
✓ Session: 24-hour expiry, device tracking
✓ Cookies: Secure, HttpOnly, SameSite=Strict
✓ HTTPS: Enforced in production
✓ CORS: Restricted to allowed origins
```

---

## 6. WHATSAPP INTEGRATION FLOW

### 6.1 Customer Message Flow

```
Customer sends message on WhatsApp
  ↓
Meta Cloud API webhook receives message
  ↓
Backend processes via /webhooks/whatsapp/messages
  ↓
Identify or create customer from phone number
  ↓
Get or create chat session
  ↓
Determine customer intent (NLP/rules-based)
  ↓
Route to appropriate handler:
  • Menu request → Send menu categories
  • Product selection → Send product details
  • Cart action → Update cart
  • Checkout → Collect address & payment info
  • Human handoff → Notify business owner
  ↓
Send response back to customer
  ↓
Update session state
  ↓
Log interaction in audit trail
```

### 6.2 Order Management Flow

```
Customer initiates order:
  1. Create order record (status: CART)
  2. Store items in order_items table
  3. Generate unique order_number
  
Customer selects checkout:
  1. Confirm delivery type (delivery/pickup)
  2. Collect/confirm delivery address
  3. Select payment method
  4. Confirm order
  
Order created:
  1. Change status to PENDING
  2. Send confirmation to customer
  3. Notify business owner (dashboard + WhatsApp message)
  4. Create notification record
  5. Update customer metrics (total_orders, total_spent)

Business owner actions:
  1. ACCEPT → Change to ACCEPTED, notify customer
  2. PREPARE → Change to PREPARING, notify customer
  3. READY → Change to READY, notify customer
  4. DELIVER → Change to DELIVERED, notify customer
  5. COMPLETE → Change to COMPLETED, request feedback
  6. REJECT → Change to CANCELED, process refund

Post-order:
  1. Request feedback/rating
  2. Update customer loyalty metrics
  3. Update business analytics
```

---

## 7. FRONTEND ARCHITECTURE

### 7.1 Page Structure

```
/whatsapp-ordering-portal/frontend/src
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── EmailVerificationPage.jsx
│   │   ├── OTPVerificationPage.jsx
│   │   └── ForgotPasswordPage.jsx
│   ├── dashboard/
│   │   ├── DashboardLayout.jsx
│   │   ├── OverviewPage.jsx
│   │   ├── OrdersPage.jsx
│   │   ├── CustomersPage.jsx
│   │   ├── ProductsPage.jsx
│   │   └── AnalyticsPage.jsx
│   ├── setup/
│   │   ├── BusinessProfilePage.jsx
│   │   ├── WhatsAppSetupPage.jsx
│   │   ├── MenuSetupPage.jsx
│   │   └── SettingsPage.jsx
│   ├── onboarding/
│   │   ├── OnboardingFlow.jsx
│   │   ├── WelcomePage.jsx
│   │   └── SetupChecklistPage.jsx
│   └── NotFoundPage.jsx
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── common/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── PageLoader.jsx
│   │   └── Toast.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── Modal.jsx
│       ├── Form.jsx
│       └── Table.jsx
├── context/
│   ├── AuthContext.jsx
│   ├── BusinessContext.jsx
│   ├── NotificationContext.jsx
│   └── ThemeContext.jsx
├── services/
│   ├── api.js (Axios instance)
│   ├── authService.js
│   ├── businessService.js
│   ├── orderService.js
│   ├── productService.js
│   └── analyticsService.js
├── hooks/
│   ├── useAuth.js
│   ├── useBusiness.js
│   ├── useFetch.js
│   └── useNotification.js
├── styles/
│   ├── index.css
│   ├── variables.css
│   ├── dashboard.css
│   └── responsive.css
├── utils/
│   ├── validators.js
│   ├── formatters.js
│   ├── constants.js
│   └── storage.js
└── App.jsx
```

### 7.2 UI Components

- **Authentication:** Login, Signup, OTP verification forms
- **Dashboard:** Stats cards, charts (orders/revenue), quick actions
- **Orders Management:** Table with filters, order detail modal, status updater
- **Products:** Category management, product CRUD, bulk upload
- **Customers:** Customer list with contact history
- **Settings:** Business profile, WhatsApp configuration
- **Analytics:** Sales charts, order trends, customer metrics

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Deployment Targets

```
Production Deployment:

Web Server:
  - Nginx reverse proxy
  - Handle HTTPS/TLS termination
  - Load balancing across Node.js instances

Backend Services:
  - Node.js 18+ (Express)
  - PM2 for process management
  - Auto-restart on failure
  - Multiple instances for load balancing

Frontend:
  - Static files served via CDN (Vercel, Netlify, or S3 + CloudFront)
  - Build artifacts cached
  - Automatic deployment on git push

Database:
  - PostgreSQL (existing server)
  - New schema: whatsapp_portal
  - Automated backups
  - Separate read replicas optional

Cache:
  - Redis (existing instance or separate)
  - Session storage
  - Real-time data caching

Queue System:
  - Bull/RabbitMQ for async jobs
  - Email sending
  - WhatsApp message delivery
  - Notification processing

Monitoring:
  - Prometheus + Grafana
  - Error tracking (Sentry)
  - Log aggregation (ELK)
  - APM (Application Performance Monitoring)
```

### 8.2 Docker Setup

```
docker-compose.yml structure:

Services:
  - backend (Node.js + Express)
  - frontend (Nginx + React build)
  - postgres (PostgreSQL) - optional, can reuse existing
  - redis (Redis) - optional, can reuse existing

Volumes:
  - Database data persistence
  - Log aggregation
  - File uploads

Networks:
  - Internal communication
  - External exposure only for Nginx
```

---

## 9. SECURITY CHECKLIST

### 9.1 Implementation Checklist

- [ ] HTTPS/TLS in production
- [ ] Password hashing (bcrypt 12+)
- [ ] JWT secure secret (32+ chars)
- [ ] OTP rate limiting (max 3 attempts per minute)
- [ ] CORS properly configured
- [ ] CSRF tokens for mutations
- [ ] XSS protection (Content Security Policy)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting on auth endpoints (5 failed attempts → 15 min lockout)
- [ ] Request validation & sanitization
- [ ] Encrypted sensitive fields (WhatsApp tokens, API keys)
- [ ] Secure cookie settings (Secure, HttpOnly, SameSite)
- [ ] Database credentials in environment variables
- [ ] API keys in environment variables (never in code)
- [ ] Audit logging for all business-critical actions
- [ ] Session timeout (24 hours)
- [ ] Refresh token rotation
- [ ] Data encryption at rest (for sensitive data)
- [ ] Regular security audits
- [ ] Penetration testing before production
- [ ] Vulnerability scanning in CI/CD

---

## 10. PRODUCTION READINESS CHECKLIST

### 10.1 Code Quality

- [ ] No console.log statements in production
- [ ] Comprehensive error handling
- [ ] Input validation on all endpoints
- [ ] Proper HTTP status codes
- [ ] API versioning in place
- [ ] Request/response logging
- [ ] Graceful shutdown handling
- [ ] Circuit breaker for external services
- [ ] Retry logic for failed operations

### 10.2 Testing

- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] API endpoint tests
- [ ] Authentication flow tests
- [ ] Load tests
- [ ] Security tests

### 10.3 Monitoring & Alerting

- [ ] Application logs (Winston)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Prometheus)
- [ ] Uptime monitoring
- [ ] Alert for critical errors
- [ ] Alert for database issues
- [ ] Alert for API rate limits exceeded

### 10.4 Documentation

- [ ] API documentation (Swagger)
- [ ] Deployment guide
- [ ] Environment setup guide
- [ ] Database schema documentation
- [ ] Security documentation
- [ ] Troubleshooting guide

---

## 11. INFRASTRUCTURE REUSE STRATEGY

### 11.1 Shared Resources

| Resource | Reuse Strategy | Safety Measures |
|----------|---|---|
| **PostgreSQL** | New schema `whatsapp_portal` | Separate namespace, table prefix `wa_` |
| **Redis** | Separate database (e.g., DB 1) | No key collisions with my-skoolz keys |
| **SMTP/Email** | Reuse existing service | Own email templates, no logic changes |
| **S3/Storage** | Separate bucket path `/whatsapp-portal/` | Isolated from existing app |
| **Docker Registry** | Separate image: `whatsapp-ordering-portal:latest` | No conflicts with existing images |
| **CI/CD Pipeline** | New workflow file | Separate build steps, no shared jobs |
| **Monitoring** | Separate alerts + dashboards | Different metric namespaces |
| **Secrets Manager** | Separate credentials | Namespace isolation |

### 11.2 Safety Guarantees

```
✓ Read-only access to my-skoolz tables
✓ No triggers/procedures on existing tables
✓ No schema modifications to existing app
✓ No user/auth table modifications
✓ Separate database credentials (if needed)
✓ Namespace isolation prevents key collisions
✓ Independent scaling and deployment
✓ Rollback capability without affecting existing app
```

---

## 12. IMPLEMENTATION ROADMAP

### Phase 1: Foundation & Setup (Week 1)
- [ ] Create folder structure
- [ ] Set up Express server boilerplate
- [ ] Configure database connection
- [ ] Initialize frontend React project
- [ ] Set up environment variables
- [ ] Docker setup

### Phase 2: Authentication (Week 1-2)
- [ ] User signup endpoint
- [ ] Email verification
- [ ] Password hashing
- [ ] OTP generation & verification
- [ ] JWT implementation
- [ ] Login/logout endpoints
- [ ] Rate limiting
- [ ] Frontend auth pages

### Phase 3: Business Setup (Week 2)
- [ ] Business profile CRUD
- [ ] WhatsApp configuration
- [ ] Message templates setup
- [ ] Frontend business setup pages

### Phase 4: Products & Menu (Week 2-3)
- [ ] Category management
- [ ] Product CRUD
- [ ] Product images upload
- [ ] Frontend product pages
- [ ] Bulk upload functionality

### Phase 5: Orders & WhatsApp (Week 3-4)
- [ ] WhatsApp Cloud API integration
- [ ] Webhook endpoints
- [ ] Message parsing & routing
- [ ] Order creation flow
- [ ] Customer database management
- [ ] Order status management
- [ ] Frontend order management pages

### Phase 6: Dashboard & Analytics (Week 4-5)
- [ ] Dashboard overview page
- [ ] Order analytics
- [ ] Sales analytics
- [ ] Customer insights
- [ ] Charts & widgets

### Phase 7: Testing & Documentation (Week 5-6)
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation
- [ ] Deployment guide
- [ ] Security audit

### Phase 8: Production Deployment (Week 6)
- [ ] Docker build
- [ ] CI/CD pipeline setup
- [ ] Production environment setup
- [ ] Monitoring setup
- [ ] Go-live

---

## 13. FILES TO BE CREATED

### Backend Files
```
/whatsapp-ordering-portal/backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── jwt.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── businessController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── customerController.js
│   │   ├── whatsappController.js
│   │   └── analyticsController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── validation.js
│   │   └── corsMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Business.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Customer.js
│   │   ├── OtpToken.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── business.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── customers.js
│   │   ├── webhooks.js
│   │   ├── analytics.js
│   │   └── admin.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── emailService.js
│   │   ├── whatsappService.js
│   │   ├── orderService.js
│   │   ├── productService.js
│   │   └── analyticsService.js
│   ├── utils/
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── constants.js
│   │   ├── crypto.js
│   │   └── logger.js
│   ├── migrations/
│   │   ├──001_create_users_table.js
│   │   ├── 002_create_businesses_table.js
│   │   ├── 003_create_products_table.js
│   │   ├── 004_create_orders_table.js
│   │   └── 005_create_indexes.js
│   ├── seeds/
│   │   └── seedDatabase.js
│   └── app.js
├── .env.example
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

### Frontend Files
```
/whatsapp-ordering-portal/frontend/
├── src/
│   ├── pages/
│   ├── components/
│   ├── context/
│   ├── services/
│   ├── hooks/
│   ├── styles/
│   ├── utils/
│   ├── __tests__/
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env.example
├── vite.config.js
├── vitest.config.js
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

### Docker & Deployment
```
/whatsapp-ordering-portal/
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
└── .github/workflows/
    └── deploy.yml
```

### Documentation
```
/whatsapp-ordering-portal/
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── DATABASE.md
│   ├── WHATSAPP_INTEGRATION.md
│   ├── TROUBLESHOOTING.md
│   └── FAQ.md
└── README.md
```

---

## 14. SUCCESS CRITERIA

✅ All code isolated in `/whatsapp-ordering-portal` folder  
✅ No modifications to existing my-skoolz application  
✅ Zero breaking changes to existing APIs or database  
✅ Production-ready code with proper error handling  
✅ Comprehensive security implementation  
✅ Full test coverage (>80%)  
✅ Complete API documentation  
✅ Deployment-ready Docker setup  
✅ SaaS-level UI/UX  
✅ Independent deployment capability  
✅ All deliverables completed  

---

## 15. NEXT STEPS

1. ✅ **Review & Approve Architecture** (You are here)
2. **Create folder structure and setup**
3. **Implement Phase 1-2: Foundation & Authentication**
4. **Implement Phase 3-5: Business setup, Products, Orders**
5. **Implement Phase 6-8: Dashboard, Testing, Deployment**
6. **Security audit and production readiness**
7. **Go-live and monitoring**

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Next Update:** Upon completion of Phase 1
