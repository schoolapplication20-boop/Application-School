# WhatsApp Ordering Portal - Security Guide

**Enterprise-Grade Security Implementation**

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Compliance & Standards](#compliance--standards)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: WAF (Web Application Firewall)                 │
├─────────────────────────────────────────────────────────┤
│ Layer 2: DDoS Protection & Rate Limiting               │
├─────────────────────────────────────────────────────────┤
│ Layer 3: API Authentication & Authorization             │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Data Encryption & Validation                  │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Database Security & Access Control             │
└─────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### Password Security

✅ **Implemented**
- bcrypt hashing with 12 salt rounds
- Minimum 8 characters required
- Must include uppercase, lowercase, number, special character
- Salted and hashed before storage
- Never transmitted in plain text
- Password history tracking

```javascript
// Password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
const isValidPassword = (password) => {
  return password.length >= 8 && passwordRegex.test(password);
};
```

### JWT Tokens

✅ **Implemented**
- HS256 signing algorithm
- 24-hour expiration
- Refresh token rotation (30-day expiration)
- Token stored in secure HttpOnly cookies
- CSRF protection enabled

```javascript
// Token configuration
{
  type: 'HS256',
  expiresIn: '24h',
  refreshExpiration: '30d',
  algorithm: 'HS256',
  secret: 'min-32-characters-required'
}
```

### OTP Verification

✅ **Implemented**
- 6-digit OTP with 5-minute expiration
- OTP hashed before storage (SHA-256)
- Rate limited to 3 attempts per minute
- Lockout after 3 failed attempts for 15 minutes
- OTP sent via email
- One-time use only

```javascript
// OTP generation and verification
const generateOTP = () => crypto.randomInt(100000, 999999);
const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
const isValidOTP = () => verifyOTPHash(submittedOTP, storedHash);
```

### Multi-Factor Authentication (MFA)

✅ **Implemented**
- OTP on every login
- Email verification on signup
- Session tracking with device fingerprinting

---

## Data Protection

### Encryption at Rest

✅ **Implemented**
- Sensitive fields encrypted with AES-256-CBC
- Encryption key stored in environment variables
- Fields encrypted:
  - WhatsApp API tokens
  - Customer payment information
  - Personal identification data
  - Business sensitive information

```javascript
// Encryption implementation
const encrypt = (data) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};
```

### Encryption in Transit

✅ **Implemented**
- HTTPS/TLS 1.3 enforcement
- Secure WebSocket (WSS) for real-time communications
- Perfect Forward Secrecy enabled
- HSTS headers configured

```
# Security Headers
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Database Security

✅ **Implemented**
- Separate schema for data isolation (`whatsapp_portal`)
- Table prefix isolation (`wa_`)
- Row-level security (RLS) where applicable
- Database encryption enabled
- Automated backups with encryption

---

## API Security

### Input Validation & Sanitization

✅ **Implemented**
- Express validator for all inputs
- OWASP input validation rules
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- Path traversal prevention

```javascript
// Input validation
const { body, validationResult } = require('express-validator');

router.post('/orders', [
  body('product_id').isUUID(),
  body('quantity').isInt({ min: 1, max: 100 }),
  body('delivery_address').trim().isLength({ max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

### CSRF Protection

✅ **Implemented**
- CSRF tokens for all state-changing operations
- SameSite cookie attribute enabled
- Origin validation

```javascript
// CSRF token generation
app.use(csrf({ cookie: true }));

// Include in responses
res.json({
  data: {...},
  csrfToken: req.csrfToken()
});
```

### Rate Limiting

✅ **Implemented**

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Auth endpoints | 5 requests | 15 minutes |
| OTP endpoints | 3 requests | 1 minute |
| Password reset | 3 requests | 1 hour |

```javascript
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
});
```

### CORS Configuration

✅ **Implemented**
- Strict origin validation
- Credential support enabled
- Allowed methods restricted to necessary operations

```javascript
const corsOptions = {
  origin: ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

---

## Infrastructure Security

### Network Security

✅ **Implemented**
- Private subnets for databases
- Security groups restricting inbound traffic
- VPC isolation
- Network segmentation

### Secrets Management

✅ **Implemented**
- All secrets in environment variables (not in code)
- Secrets rotation policies
- Access logging for secrets
- No hardcoded credentials

```bash
# Environment variables
JWT_SECRET=xxxxx (never commit to git)
DB_PASSWORD=xxxxx (never commit to git)
ENCRYPTION_KEY=xxxxx (never commit to git)
```

### Dependency Management

✅ **Implemented**
- Regular dependency updates
- Security audits with npm audit
- Lock files committed (package-lock.json)
- No high-risk vulnerabilities allowed

```bash
# Regular security updates
npm audit
npm audit fix
npm update
```

### Container Security

✅ **Implemented**
- Non-root user in containers
- Read-only root filesystem
- Resource limits
- Health checks

```dockerfile
# Dockerfile security
USER nodejs
RUN chown -R nodejs:nodejs /app
HEALTHCHECK CMD curl -f http://localhost:3000/health
```

---

## Compliance & Standards

### Data Privacy (GDPR/CCPA Compliance)

✅ **Implemented**
- User consent management
- Data export functionality
- Right to be forgotten (data deletion)
- Privacy policy enforcement
- Data processing agreements

### API Security Standards

✅ **OWASP API Top 10**
1. ✅ Broken Authentication - OTP + JWT
2. ✅ Broken Authorization - Role-based access
3. ✅ Excessive Data Exposure - Field filtering
4. ✅ Lack of Resource & Rate Limiting - Rate limiters
5. ✅ Broken Function Level Authorization - Permission checks
6. ✅ Mass Assignment - Whitelist validation
7. ✅ Security Misconfiguration - Security headers
8. ✅ Injection - Parameterized queries
9. ✅ Improper Asset Management - Dependency scanning
10. ✅ Insufficient Logging & Monitoring - Audit logs

---

## Incident Response

### Security Incident Response Plan

```
1. Detect → Alert systems notify of suspicious activity
2. Contain → Isolate affected systems
3. Investigate → Determine scope and impact
4. Remediate → Fix vulnerabilities
5. Document → Log all actions taken
6. Communicate → Notify affected users
7. Improve → Implement preventive measures
```

### Monitoring & Alerting

✅ **Implemented**
- Failed login attempts monitoring
- Unusual API usage patterns
- Database access anomalies
- Error rate tracking
- Response time monitoring

```javascript
// Alert on suspicious activity
if (failedLoginAttempts > 5) {
  sendSecurityAlert('Multiple failed login attempts');
  lockoutUser(userId, 15 * 60 * 1000);
}
```

---

## Security Checklist

### Pre-Production

- [ ] All secrets moved to environment variables
- [ ] HTTPS/TLS certificate installed
- [ ] Database backups tested and automated
- [ ] Rate limiting configured on all endpoints
- [ ] CORS restricted to production domain
- [ ] Security headers enabled
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Password policy enforced
- [ ] OTP verification implemented
- [ ] Audit logging enabled
- [ ] Error monitoring configured (Sentry)
- [ ] Log aggregation configured
- [ ] Database encryption enabled
- [ ] Backup encryption enabled

### Production

- [ ] WAF configured and enabled
- [ ] DDoS protection enabled
- [ ] Security patches applied
- [ ] Vulnerability scan scheduled (weekly)
- [ ] Penetration test completed
- [ ] Code security scan enabled (SAST)
- [ ] Dependency scanning enabled (SCA)
- [ ] Secrets scanning enabled (Git)
- [ ] Monitoring & alerting enabled 24/7
- [ ] Incident response plan documented
- [ ] Backup restore tested monthly
- [ ] Disaster recovery plan documented
- [ ] User security training completed
- [ ] Security policy documented
- [ ] Data classification completed

---

## Regular Security Tasks

### Weekly
- [ ] Check for security updates
- [ ] Review security logs
- [ ] Check SSL certificate expiration

### Monthly
- [ ] Run vulnerability scans
- [ ] Review access logs
- [ ] Test backup restore
- [ ] Security team meeting

### Quarterly
- [ ] Penetration testing
- [ ] Security audit
- [ ] Access rights review
- [ ] Disaster recovery drill

### Annually
- [ ] Full security assessment
- [ ] Compliance audit
- [ ] Employee security training
- [ ] Policy review and update

---

## Vulnerability Disclosure

If you discover a security vulnerability, please email:
**security@yourdomain.com**

**Do not** create public GitHub issues for security vulnerabilities.

**Disclosure Process:**
1. Email security details to security@yourdomain.com
2. We will acknowledge receipt within 24 hours
3. We will work on a fix and security release
4. We will coordinate public disclosure with you

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated:** 2026-06-12  
**Next Review:** 2026-09-12
