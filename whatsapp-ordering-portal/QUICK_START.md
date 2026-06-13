# WhatsApp Ordering Portal - Quick Start Guide

**Get up and running in 5 minutes**

---

## 🚀 Quick Start (Docker)

### 1. Prerequisites
- Docker & Docker Compose installed
- Git installed

### 2. Clone & Setup

```bash
# Navigate to project
cd whatsapp-ordering-portal

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Start Services

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose -f docker/docker-compose.yml up -d

# Check logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

### 4. Access Application

- **Frontend:** http://localhost (or http://localhost:80)
- **Backend API:** http://localhost:3000
- **API Health:** http://localhost:3000/health
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

---

## 💻 Local Development (Without Docker)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment
cp .env.example .env

# Run migrations (setup database)
npm run migrate

# Optional: Seed sample data
npm run seed

# Start development server
npm run dev
```

Backend runs on: **http://localhost:3000**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs on: **http://localhost:5173**

---

## 📊 Verify Everything is Working

### Backend Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "success": true,
  "message": "WhatsApp Ordering Portal API is running",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "development"
}
```

### Database Connection

```bash
# Using Docker
docker-compose -f docker/docker-compose.yml exec postgres psql -U postgres -d whatsapp_portal -c "SELECT 1;"

# Using local psql
psql -U postgres -d whatsapp_portal -c "SELECT 1;"
```

### Redis Connection

```bash
# Using Docker
docker-compose -f docker/docker-compose.yml exec redis redis-cli PING

# Using local redis-cli
redis-cli PING
```

Should return: **PONG**

---

## 🔧 Environment Configuration

### Backend (.env)

**Critical Variables:**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=whatsapp_portal
JWT_SECRET=your_secret_here_minimum_32_chars
```

**Full list:** See `backend/.env.example`

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_ENV=development
```

---

## 📁 Project Structure

```
whatsapp-ordering-portal/
├── backend/          ← Backend API (Node.js + Express)
├── frontend/         ← Frontend (React + Vite)
├── docker/           ← Docker configurations
├── docs/             ← Documentation
└── IMPLEMENTATION_ROADMAP.md  ← Detailed plan
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run tests once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run tests once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [WHATSAPP_PORTAL_ARCHITECTURE.md](./WHATSAPP_PORTAL_ARCHITECTURE.md) | Complete architecture (160+ KB) |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Detailed implementation plan |
| [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md) | Pre-production checklist |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Deployment guide |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security implementation |
| [backend/README.md](./backend/README.md) | Backend documentation |

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process using port 3000
lsof -i :3000
kill -9 <PID>

# Kill process using port 5173
lsof -i :5173
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Check database exists
psql -U postgres -c "\l" | grep whatsapp_portal

# Run migrations
cd backend && npm run migrate
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli PING

# Check configuration in .env
cat backend/.env | grep REDIS
```

### Docker Issues

```bash
# Clear everything and restart
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up -d

# View detailed logs
docker-compose -f docker/docker-compose.yml logs -f backend
```

---

## 📋 Common Commands

### Backend

```bash
npm install           # Install dependencies
npm run dev          # Start development server
npm start            # Start production server
npm test             # Run tests
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
npm run migrate      # Run database migrations
npm run seed         # Seed sample data
```

### Frontend

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
npm run lint         # Check code quality
```

### Docker

```bash
# Development
docker-compose -f docker/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml logs -f

# Production
docker build -t whatsapp-portal-backend:latest -f docker/Dockerfile.backend .
docker build -t whatsapp-portal-frontend:latest -f docker/Dockerfile.frontend .
docker run -d --name whatsapp-backend --env-file backend/.env -p 3000:3000 whatsapp-portal-backend:latest
```

---

## 🔐 Security Notes

✅ **Don't commit `.env` files** - They contain secrets  
✅ **Use strong passwords** - Minimum 16 characters for production  
✅ **Rotate secrets regularly** - JWT_SECRET, database passwords  
✅ **Never log sensitive data** - Passwords, tokens, API keys  
✅ **Always use HTTPS** - In production  
✅ **Update dependencies** - Run `npm audit` and `npm update` regularly  

---

## 📈 Next Steps

1. **Read Documentation**
   - Start with [WHATSAPP_PORTAL_ARCHITECTURE.md](./WHATSAPP_PORTAL_ARCHITECTURE.md)
   - Then [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)

2. **Get Services Running**
   - Use Docker Compose for fastest setup
   - Or follow local development setup

3. **Explore Structure**
   - Backend: `/backend/src` directory
   - Frontend: `/frontend/src` directory
   - Database: `docker/init.sql` for schema

4. **Begin Implementation**
   - Start with Phase 1 (authentication)
   - Follow the roadmap step-by-step
   - Refer to architecture document for decisions

---

## 💬 Getting Help

### Documentation
- Architecture & Design → [WHATSAPP_PORTAL_ARCHITECTURE.md](./WHATSAPP_PORTAL_ARCHITECTURE.md)
- Implementation Plan → [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
- Deployment → [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- Security → [docs/SECURITY.md](./docs/SECURITY.md)
- Backend Code → [backend/README.md](./backend/README.md)

### Common Questions

**Q: Will this affect the existing my-skoolz app?**  
A: No. It's completely isolated with separate schema, tables, and containers.

**Q: How do I deploy to production?**  
A: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

**Q: What's the security model?**  
A: Enterprise-grade with bcrypt hashing, JWT auth, OTP verification, and encryption. See [docs/SECURITY.md](./docs/SECURITY.md).

**Q: Can I use Kubernetes?**  
A: Yes! See [k8s/](./k8s) folder (ready for manifests).

**Q: How do I add new features?**  
A: Follow the patterns established in the code structure. See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for guidance.

---

## 🎉 Ready to Go!

You now have:
- ✅ Complete project structure
- ✅ Working development environment
- ✅ Comprehensive documentation
- ✅ Security frameworks
- ✅ Testing setup
- ✅ Docker containerization
- ✅ Implementation roadmap

**Start developing! 🚀**

---

**Last Updated:** 2026-06-12  
**Version:** 1.0  
**Status:** Ready for Development
