# WhatsApp Ordering Portal - Backend API

**Node.js + Express RESTful API**

A production-ready backend API for the WhatsApp Ordering Portal SaaS platform.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL 14+ (or use Docker)
- Redis (optional, or use Docker)

### Development Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run database migrations
npm run migrate

# Seed database with sample data (optional)
npm run seed

# Start development server
npm run dev
```

Server will run on `http://localhost:3000`

### Production Setup

```bash
# Install dependencies
npm install --production

# Run migrations
npm run migrate

# Start server
npm start
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Sequelize & PostgreSQL config
│   │   ├── redis.js             # Redis connection & methods
│   │   └── jwt.js               # JWT token generation/verification
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT authentication
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── rateLimiter.js       # Rate limiting
│   │   ├── corsMiddleware.js    # CORS configuration
│   │   └── validation.js        # Input validation rules
│   │
│   ├── controllers/
│   │   ├── authController.js    # Auth endpoints
│   │   ├── businessController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── ...
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Business.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── ...
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── business.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── authService.js       # Auth business logic
│   │   ├── emailService.js      # Email sending
│   │   ├── whatsappService.js   # WhatsApp API integration
│   │   └── ...
│   │
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   ├── validators.js        # Validation functions
│   │   ├── formatters.js        # Data formatting
│   │   ├── crypto.js            # Encryption/hashing
│   │   └── constants.js         # Constants & enums
│   │
│   ├── migrations/              # Database migrations
│   ├── seeds/                   # Database seeds
│   └── app.js                   # Express app setup
│
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json
├── .dockerignore
└── README.md
```

---

## API Endpoints

### Authentication

```
POST   /api/v1/auth/signup
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/login
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

### Businesses

```
GET    /api/v1/businesses/:id
PUT    /api/v1/businesses/:id
POST   /api/v1/businesses/whatsapp/setup
GET    /api/v1/businesses/whatsapp/config
PUT    /api/v1/businesses/whatsapp/config
```

### Products

```
GET    /api/v1/products/categories
POST   /api/v1/products/categories
GET    /api/v1/products
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id
```

### Orders

```
GET    /api/v1/orders
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/accept
POST   /api/v1/orders/:id/complete
POST   /api/v1/orders/:id/cancel
```

### Webhooks

```
POST   /api/v1/webhooks/whatsapp/messages
POST   /api/v1/webhooks/whatsapp/status
```

---

## Environment Variables

See `.env.example` for all available variables. Key variables:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_portal
DB_USER=postgres
DB_PASSWORD=password
DB_SCHEMA=whatsapp_portal

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_here_min_32_chars
JWT_REFRESH_SECRET=your_secret_here_min_32_chars

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=app_password

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

---

## Database Schema

All tables are in the `whatsapp_portal` schema with `wa_` prefix:

### Key Tables
- `wa_users` - User accounts
- `wa_businesses` - Business profiles
- `wa_products` - Menu items
- `wa_categories` - Product categories
- `wa_orders` - Customer orders
- `wa_customers` - Customer information
- `wa_audit_logs` - Activity logs

Run migrations to create tables:
```bash
npm run migrate
```

---

## Authentication Flow

### Signup
```
POST /auth/signup
Body: { email, password }
Response: { user, verification_email_sent: true }
```

### Login (Step 1: Email + Password)
```
POST /auth/login
Body: { email, password }
Response: { requires_otp: true, otp_delivery_method: "email" }
```

### Login (Step 2: OTP Verification)
```
POST /auth/verify-otp
Body: { email, otp }
Response: { access_token, refresh_token, user }
```

---

## Middleware Stack

### Order of Execution
1. **CORS** - Cross-origin requests
2. **Helmet** - Security headers
3. **Morgan** - Request logging
4. **Body Parser** - JSON/URL parsing
5. **Rate Limiter** - Request rate limiting
6. **Authentication** - JWT verification (if needed)
7. **Validation** - Input validation
8. **Error Handler** - Global error handling

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {} // Optional details
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| INVALID_CREDENTIALS | 401 | Email or password incorrect |
| INVALID_TOKEN | 401 | Token is invalid or expired |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Input validation failed |
| DUPLICATE_ENTRY | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_SERVER_ERROR | 500 | Server error |

---

## Logging

Logs are stored in `logs/` directory using Winston:

- **error.log** - Error logs only
- **all.log** - All logs
- **exceptions.log** - Uncaught exceptions
- **rejections.log** - Unhandled rejections

View logs:
```bash
tail -f logs/all.log
```

---

## Testing

### Run Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

---

## Code Quality

### Lint Code
```bash
npm run lint
```

### Fix Linting Issues
```bash
npm run lint:fix
```

---

## Deployment

### Docker Build
```bash
docker build -t whatsapp-portal-backend:latest -f docker/Dockerfile.backend .
```

### Docker Run
```bash
docker run -d \
  --name whatsapp-backend \
  --env-file .env \
  -p 3000:3000 \
  whatsapp-portal-backend:latest
```

### Docker Compose
```bash
docker-compose -f docker/docker-compose.yml up -d backend
```

---

## Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "success": true,
  "message": "WhatsApp Ordering Portal API is running",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "development"
}
```

---

## Performance Optimization

### Database Optimization
- Indexes created on frequently queried columns
- Query optimization with Sequelize
- Connection pooling configured

### Caching Strategy
- Redis for session storage
- Cache product catalogs
- Cache business configurations

### Rate Limiting
- Prevent brute force attacks
- Protect against DDoS
- Fair resource allocation

---

## Security Features

✅ Password hashing (bcrypt 12 rounds)  
✅ JWT authentication  
✅ OTP verification  
✅ Email verification  
✅ Input validation & sanitization  
✅ CORS protection  
✅ CSRF prevention  
✅ Rate limiting  
✅ Secure cookies  
✅ Audit logging  
✅ Error handling  
✅ SQL injection prevention  

---

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost -c "SELECT 1;"

# Check database exists
psql -U postgres -c "\l" | grep whatsapp_portal

# Run migrations
npm run migrate
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli PING

# Check Redis configuration
cat .env | grep REDIS
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

---

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/name`
4. Submit pull request

---

## Support

For issues or questions:
- Create an issue on GitHub
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com

---

**Built with ❤️**
