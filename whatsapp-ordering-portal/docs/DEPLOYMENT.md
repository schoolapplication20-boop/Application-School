# WhatsApp Ordering Portal - Deployment Guide

**Production Deployment Instructions**

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Railway Deployment (Recommended)](#railway-deployment-recommended)
3. [Local Environment Setup](#local-environment-setup)
4. [Docker Build & Deploy](#docker-build--deploy)
5. [Cloud Deployment](#cloud-deployment)
6. [Database Setup](#database-setup)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Security
- [ ] All secrets in environment variables (not in code)
- [ ] JWT_SECRET is 32+ characters
- [ ] Database password is strong (16+ characters)
- [ ] CORS origins restricted to your domain
- [ ] HTTPS/TLS enabled
- [ ] API rate limiting configured
- [ ] Database backups enabled and tested
- [ ] Firewall rules configured

### Application
- [ ] All tests passing (`npm test`)
- [ ] Code coverage > 80%
- [ ] No console.log statements in production
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Health check endpoint working
- [ ] Database migrations tested
- [ ] Environment variables documented

### Infrastructure
- [ ] PostgreSQL configured and accessible
- [ ] Redis configured (if using)
- [ ] SMTP/Email service configured
- [ ] WhatsApp Business Account configured
- [ ] Domain name configured
- [ ] SSL certificate installed
- [ ] CDN configured (if applicable)

---

## Railway Deployment (Recommended)

This is the deployment target used for this project. The repo includes
`backend/railway.json` and `frontend/railway.json` so each service builds
with sensible defaults out of the box.

### 1. Create the project and data plugins

1. In Railway, create a new project (or use the existing one for this repo).
2. Add a **PostgreSQL** plugin - it provides `DATABASE_URL` automatically.
3. Add a **Redis** plugin - it provides `REDIS_URL` automatically.

The backend reads `DATABASE_URL`/`REDIS_URL` when present (see
`backend/src/config/dbEnv.js`), so no manual host/port/user wiring is needed.

### 2. Backend service

1. **New Service → Deploy from GitHub repo**, set **Root Directory** to
   `whatsapp-ordering-portal/backend`.
2. Railway detects Node via Nixpacks and uses `backend/railway.json`, which:
   - runs `npm run migrate && npm start` on deploy (migrations are idempotent
     - safe to run every deploy)
   - health-checks `/health`
3. Add the PostgreSQL and Redis plugins as variable references (Railway lets
   you reference `${{Postgres.DATABASE_URL}}` / `${{Redis.REDIS_URL}}`), or
   rely on the automatic shared variables if the plugins are in the same
   project.
4. Set the remaining environment variables (see
   [Environment Configuration](#environment-configuration)):
   - `NODE_ENV=production`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (32+ chars each)
   - `DB_SCHEMA=whatsapp_portal`
   - `DB_SSL=require` if Railway's Postgres requires SSL for your plan
   - `CORS_ORIGIN` - set after the frontend domain is known (step 3)
   - `FRONTEND_URL` - the frontend's Railway domain
   - SMTP and WhatsApp Cloud API credentials
5. Generate a public domain for this service (Settings → Networking →
   Generate Domain). Note the URL, e.g. `https://wa-portal-api.up.railway.app`.

### 3. Frontend service

1. **New Service → Deploy from GitHub repo**, set **Root Directory** to
   `whatsapp-ordering-portal/frontend`.
2. `frontend/railway.json` runs `npm run build` then serves the `dist/`
   folder with `serve` bound to Railway's `$PORT`.
3. Set the build-time environment variable:
   - `VITE_API_BASE_URL=https://<backend-domain>/api/v1` (from step 2.5)
4. Generate a public domain for this service, e.g.
   `https://wa-portal.up.railway.app`.

### 4. Wire CORS

Back on the backend service, set:
- `CORS_ORIGIN=https://<frontend-domain>` (from step 3.4)
- `ALLOW_CREDENTIALS=true`

Redeploy the backend so the new CORS origin takes effect.

### 5. Configure WhatsApp webhook

Once both services are live, point the Meta WhatsApp app's webhook at:
`https://<backend-domain>/api/v1/webhooks/whatsapp/messages`, using the same
`webhook_verify_token` configured for the business in the portal's Settings
page.

---

## Local Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd whatsapp-ordering-portal
```

### 2. Create Environment Files

**Backend (.env)**
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=whatsapp_portal
DB_USER=db_user
DB_PASSWORD=secure_password_here
DB_SCHEMA=whatsapp_portal
REDIS_HOST=your-redis-host
REDIS_PORT=6379
JWT_SECRET=your_32_character_minimum_secret_here
JWT_REFRESH_SECRET=your_32_character_minimum_refresh_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your_app_password
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
CORS_ORIGIN=https://yourdomain.com
```

**Frontend (.env)**
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_APP_NAME=WhatsApp Ordering Portal
VITE_ENV=production
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install --production
cd ..

# Frontend
cd frontend
npm install --production
cd ..
```

---

## Docker Build & Deploy

### 1. Build Docker Images

```bash
# Build backend image
docker build -t whatsapp-portal-backend:latest -f docker/Dockerfile.backend .

# Build frontend image
docker build -t whatsapp-portal-frontend:latest -f docker/Dockerfile.frontend .

# Tag for registry (e.g., Docker Hub, ECR)
docker tag whatsapp-portal-backend:latest myregistry/whatsapp-portal-backend:latest
docker tag whatsapp-portal-frontend:latest myregistry/whatsapp-portal-frontend:latest
```

### 2. Push to Registry

```bash
# Login to registry
docker login

# Push images
docker push myregistry/whatsapp-portal-backend:latest
docker push myregistry/whatsapp-portal-frontend:latest
```

### 3. Deploy Containers

```bash
# Backend
docker run -d \
  --name whatsapp-backend \
  --env-file backend/.env \
  -p 3000:3000 \
  --restart unless-stopped \
  myregistry/whatsapp-portal-backend:latest

# Frontend
docker run -d \
  --name whatsapp-frontend \
  -p 80:80 \
  -p 443:443 \
  --restart unless-stopped \
  myregistry/whatsapp-portal-frontend:latest
```

### 4. Verify Deployment

```bash
# Check backend
curl http://localhost:3000/health

# Check frontend
curl http://localhost/
```

---

## Cloud Deployment

### AWS Deployment

#### Using EC2

```bash
# SSH into instance
ssh -i key.pem ec2-user@your-instance.com

# Update system
sudo yum update -y
sudo yum install -y docker git

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Clone repository
git clone <repository-url>
cd whatsapp-ordering-portal

# Configure environment
cp backend/.env.example backend/.env
# Edit .env with your values

# Run with docker-compose
docker-compose -f docker/docker-compose.yml up -d
```

#### Using ECS

1. Create ECR repositories for backend and frontend
2. Build and push images to ECR
3. Create ECS task definitions
4. Create ECS service
5. Configure load balancer
6. Configure auto-scaling

#### Using ELastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p docker whatsapp-portal

# Create environment
eb create production

# Deploy
eb deploy
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create apps
heroku create whatsapp-portal-backend
heroku create whatsapp-portal-frontend

# Set environment variables
heroku config:set -a whatsapp-portal-backend JWT_SECRET="your-secret"
heroku config:set -a whatsapp-portal-backend DB_HOST="your-db-host"
# ... set other variables

# Deploy
git push heroku main
```

### DigitalOcean Deployment

```bash
# Create droplet with Docker pre-installed

# SSH into droplet
ssh root@your-droplet-ip

# Clone repository
git clone <repository-url>
cd whatsapp-ordering-portal

# Setup Docker
docker-compose -f docker/docker-compose.yml up -d

# Configure Nginx reverse proxy
# Edit /etc/nginx/sites-available/default
```

---

## Database Setup

### PostgreSQL Setup

```bash
# Connect to PostgreSQL server
psql -U postgres -h your-db-host

# Create database
CREATE DATABASE whatsapp_portal;

# Create schema
\c whatsapp_portal
CREATE SCHEMA whatsapp_portal;

# Run initialization script
psql -U postgres -d whatsapp_portal -f docker/init.sql

# Create backup user
CREATE USER whatsapp_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_portal TO whatsapp_user;
GRANT ALL PRIVILEGES ON SCHEMA whatsapp_portal TO whatsapp_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA whatsapp_portal TO whatsapp_user;
```

### Backup Strategy

```bash
# Daily backup
0 2 * * * pg_dump -U postgres whatsapp_portal > /backups/whatsapp_$(date +\%Y\%m\%d).sql

# Upload to S3
aws s3 cp /backups/whatsapp_$(date +%Y%m%d).sql s3://my-backups/whatsapp-portal/

# Keep 30 days of backups
find /backups -name "whatsapp_*.sql" -mtime +30 -delete
```

### Restore from Backup

```bash
# Restore database
psql -U postgres whatsapp_portal < whatsapp_20240101.sql
```

---

## Environment Configuration

### Production Environment Variables

**Backend - Important Variables**

```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://api.yourdomain.com

# Database
DB_HOST=db.yourdomain.com
DB_PORT=5432
DB_NAME=whatsapp_portal
DB_USER=whatsapp_user
DB_PASSWORD=<very-secure-password>
DB_SCHEMA=whatsapp_portal

# Redis
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Security
JWT_SECRET=<generate-32-char-random-string>
JWT_REFRESH_SECRET=<generate-32-char-random-string>
ENCRYPTION_KEY=<generate-32-char-random-string>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@yourdomain.com

# WhatsApp
WHATSAPP_BUSINESS_ACCOUNT_ID=<your-account-id>
WHATSAPP_ACCESS_TOKEN=<your-token>
WHATSAPP_PHONE_NUMBER_ID=<your-phone-id>

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=<your-sentry-dsn>
```

### Generate Secure Secrets

```bash
# Generate 32-character random string
openssl rand -hex 16

# Example output:
# a3f8d9c2e1b4f7a9c3e8d2b5f9a1c7e4
```

---

## Monitoring & Logging

### Setup Monitoring

#### Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'whatsapp-backend'
    static_configs:
      - targets: ['localhost:3000']
```

#### Grafana

1. Add Prometheus as data source
2. Import dashboards for Node.js metrics
3. Create alerts for critical metrics

### Log Aggregation

#### Using ELK Stack

```bash
# Docker compose for ELK
docker-compose -f docker/docker-compose.elk.yml up -d
```

#### Using CloudWatch (AWS)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

---

## Backup & Recovery

### Database Backups

```bash
# Automated daily backup script
#!/bin/bash
BACKUP_DIR="/backups/whatsapp-portal"
DB_NAME="whatsapp_portal"
DB_USER="whatsapp_user"
DB_HOST="your-db-host"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/whatsapp_$(date +%Y%m%d_%H%M%S).sql.gz"

# Upload to S3
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/whatsapp-portal/

# Keep only 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Application Backups

```bash
# Backup uploaded files
tar -czf app_uploads_$(date +%Y%m%d).tar.gz uploads/
aws s3 cp app_uploads_*.tar.gz s3://your-backup-bucket/

# Backup configuration
tar -czf app_config_$(date +%Y%m%d).tar.gz .env docker/
aws s3 cp app_config_*.tar.gz s3://your-backup-bucket/
```

---

## Troubleshooting

### Application Not Starting

```bash
# Check logs
docker logs whatsapp-backend
docker logs whatsapp-frontend

# Check database connection
psql -h your-db-host -U whatsapp_user -d whatsapp_portal -c "SELECT 1;"

# Check Redis connection
redis-cli -h your-redis-host PING
```

### High Memory Usage

```bash
# Check memory usage
docker stats whatsapp-backend

# View processes
ps aux | grep node

# Restart container
docker restart whatsapp-backend
```

### Database Lock Issues

```bash
# Connect to database
psql -U whatsapp_user -d whatsapp_portal

# Kill long-running queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > '1 hour'::interval;
```

### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/certs/your-cert.crt -noout -dates

# Renew with Let's Encrypt
certbot renew

# Restart web server
sudo systemctl restart nginx
```

---

## Performance Optimization

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_orders_business_status ON wa_orders(business_id, status);
CREATE INDEX idx_customers_business_phone ON wa_customers(business_id, whatsapp_number);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM wa_orders WHERE business_id = 'xxx' ORDER BY created_at DESC;
```

### Caching Strategy

```javascript
// Cache product catalog
redis.setex(`catalog:${businessId}`, 3600, JSON.stringify(products));

// Cache user sessions
redis.setex(`session:${sessionId}`, 86400, JSON.stringify(userData));
```

### Load Balancing

```bash
# Nginx load balancing
upstream whatsapp_backend {
  server backend1:3000;
  server backend2:3000;
  server backend3:3000;
}

server {
  listen 80;
  location /api {
    proxy_pass http://whatsapp_backend;
  }
}
```

---

## Rollback Procedure

```bash
# Stop current version
docker stop whatsapp-backend whatsapp-frontend

# Run previous version
docker run -d \
  --name whatsapp-backend \
  --env-file backend/.env \
  -p 3000:3000 \
  whatsapp-portal-backend:v1.0.0

# Rollback database (if needed)
psql -U whatsapp_user -d whatsapp_portal < backup_previous_version.sql
```

---

## Support

For deployment issues, contact:
- Email: devops@yourdomain.com
- Documentation: https://docs.yourdomain.com
