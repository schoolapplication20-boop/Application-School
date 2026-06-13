# WhatsApp Ordering Portal

**SaaS Platform for WhatsApp-based Ordering**

A production-ready, multi-tenant ordering system that enables restaurants, grocery stores, cafes, and retail shops to receive and manage orders directly through WhatsApp.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker & Docker Compose (for containerized setup)
- PostgreSQL 14+ (or use Docker)
- Redis (or use Docker)

### Local Development (Without Docker)

**1. Setup Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

**2. Setup Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

**3. Access Application**
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

### Docker Setup (Recommended)

```bash
# Build and start all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

Services will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 📁 Project Structure

```
whatsapp-ordering-portal/
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Database, JWT, Redis configs
│   │   ├── controllers/      # API controllers
│   │   ├── middleware/       # Auth, error handling, validation
│   │   ├── models/           # Sequelize models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utilities (logger, validators, crypto)
│   │   ├── migrations/       # Database migrations
│   │   ├── seeds/            # Database seeds
│   │   └── app.js            # Main application
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── README.md
├── frontend/                  # React 18 + Vite
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── context/          # State management
│   │   ├── services/         # API services
│   │   ├── hooks/            # Custom hooks
│   │   ├── styles/           # CSS files
│   │   ├── utils/            # Utilities
│   │   ├── __tests__/        # Tests
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/               # Static assets
│   ├── .env.example
│   ├── vite.config.js
│   ├── vitest.config.js
│   ├── package.json
│   └── README.md
├── docker/                    # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   ├── nginx.conf
│   ├── default.conf
│   └── init.sql
├── k8s/                       # Kubernetes manifests (future)
├── .github/workflows/         # CI/CD pipelines (future)
├── docs/                      # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── DATABASE.md
└── README.md
```

---

## 🔐 Authentication

### Signup Flow
```
1. Email + Password Registration
2. Email Verification (link sent to email)
3. Account Ready for Login
```

### Login Flow
```
1. Enter Email + Password
2. Receive OTP (via Email)
3. Verify OTP
4. Receive JWT Token
5. Access Granted
```

---

## 📊 Database Schema

All tables use the `whatsapp_portal` schema with `wa_` prefix for isolation:

- `wa_users` - User accounts
- `wa_businesses` - Business profiles
- `wa_products` - Menu items
- `wa_categories` - Product categories
- `wa_orders` - Customer orders
- `wa_customers` - Customer information
- `wa_chat_sessions` - WhatsApp chat tracking
- `wa_audit_logs` - Activity logs

See [docs/DATABASE.md](./docs/DATABASE.md) for complete schema.

---

## 🔌 WhatsApp Integration

### Setup WhatsApp Business Account

1. **Create Meta Business Account** at https://business.facebook.com
2. **Create WhatsApp Business App**
3. **Get Access Token & Phone Number ID**
4. **Configure Webhook** in Business Settings:
   - Webhook URL: `https://your-domain/api/v1/webhooks/whatsapp/messages`
   - Verify Token: (use value from `.env`)

### Message Flow

```
Customer WhatsApp Message
    ↓
Meta Webhook → Backend API
    ↓
Process & Route to Handler
    ↓
Send Response via Meta API
    ↓
Customer Receives Response
```

---

## 🛠️ API Documentation

### Authentication Endpoints

```
POST   /api/v1/auth/signup              - Create account
POST   /api/v1/auth/verify-email        - Verify email address
POST   /api/v1/auth/login               - Start login (get OTP)
POST   /api/v1/auth/verify-otp          - Verify OTP and get JWT
POST   /api/v1/auth/logout              - Logout
POST   /api/v1/auth/refresh-token       - Refresh JWT
POST   /api/v1/auth/forgot-password     - Start password reset
POST   /api/v1/auth/reset-password      - Complete password reset
```

### Business Endpoints

```
GET    /api/v1/businesses/:id           - Get business profile
PUT    /api/v1/businesses/:id           - Update business
POST   /api/v1/businesses/whatsapp/setup - Configure WhatsApp
GET    /api/v1/businesses/whatsapp/config - Get WhatsApp config
```

### Products Endpoints

```
GET    /api/v1/products/categories      - Get categories
POST   /api/v1/products/categories      - Create category
GET    /api/v1/products                 - Get products
POST   /api/v1/products                 - Create product
PUT    /api/v1/products/:id             - Update product
DELETE /api/v1/products/:id             - Delete product
```

### Orders Endpoints

```
GET    /api/v1/orders                   - Get orders list
GET    /api/v1/orders/:id               - Get order details
POST   /api/v1/orders/:id/accept        - Accept order
POST   /api/v1/orders/:id/complete      - Mark as completed
POST   /api/v1/orders/:id/cancel        - Cancel order
```

For complete API documentation, see [docs/API.md](./docs/API.md).

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Code coverage
npm run test:coverage
```

---

## 📦 Deployment

### Production Checklist

- [ ] All environment variables configured
- [ ] Database backups enabled
- [ ] SSL/TLS certificate installed
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Error monitoring (Sentry) setup
- [ ] Logging aggregation enabled
- [ ] Monitoring & alerting configured
- [ ] Security audit completed
- [ ] Load testing passed

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed steps.

### Docker Production Build

```bash
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

---

## 🔒 Security

### Features
- ✅ Password hashing (bcrypt 12 rounds)
- ✅ JWT-based authentication
- ✅ OTP verification on every login
- ✅ Email verification
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Secure cookies
- ✅ CORS restrictions
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Audit logging
- ✅ Data encryption at rest

See [docs/SECURITY.md](./docs/SECURITY.md) for security details.

---

## 📈 Monitoring

### Logs

```bash
# View logs
docker-compose -f docker/docker-compose.yml logs -f backend
docker-compose -f docker/docker-compose.yml logs -f frontend
```

### Health Check

```bash
# API Health
curl http://localhost:3000/health

# Database Health
psql -U postgres -d whatsapp_portal -c "SELECT 1"
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL service
docker-compose -f docker/docker-compose.yml logs postgres

# Connect directly
psql -U postgres -h localhost -d whatsapp_portal
```

### Redis Connection Issues

```bash
# Check Redis service
docker-compose -f docker/docker-compose.yml logs redis

# Test connection
redis-cli -h localhost -p 6379 PING
```

### Backend Not Starting

```bash
# Check logs
docker-compose -f docker/docker-compose.yml logs backend

# Clear containers and restart
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up
```

---

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/DATABASE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Guide](./docs/SECURITY.md)
- [WhatsApp Integration](./docs/WHATSAPP_INTEGRATION.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

For issues, questions, or support, please contact:
- Email: support@whatsappportal.com
- Documentation: https://docs.whatsappportal.com

---

**Built with ❤️ for Entrepreneurs**
