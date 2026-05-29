# my-skoolz — School Management System

A full-stack Progressive Web App (PWA) for managing schools: students, teachers, attendance, fees, examinations, homework, transport, and more.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend (Spring Boot)](#backend-spring-boot)
  - [Frontend (React + Vite)](#frontend-react--vite)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Role Hierarchy](#role-hierarchy)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)

---

## Architecture

```
my-skoolz/
├── client/          React 18 + Vite + Tailwind CSS (PWA)
├── server/          Spring Boot 3.2 + JPA + PostgreSQL
└── mobile/          React Native (Expo) mobile app
```

**Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Recharts, PWA (service worker + manifest)  
**Backend:** Spring Boot 3.2, Spring Security (JWT), Spring Data JPA, PostgreSQL, JavaMail  
**Auth:** JWT-based, stateless, role-aware (`APPLICATION_OWNER → SUPER_ADMIN → ADMIN → TEACHER → STUDENT`)

---

## Features

| Module | Roles |
|--------|-------|
| Authentication (login, forgot password, OTP, reset) | All |
| Admin Dashboard (stats, charts) | Admin, Super Admin |
| Student Management (CRUD, export) | Admin, Super Admin |
| Teacher Management | Admin, Super Admin |
| Class Management | Admin, Super Admin |
| Attendance (mark, report) | Teacher, Admin |
| Examination & Marks | Teacher, Admin |
| Homework / Assignments | Teacher, Student, Parent |
| Fee Management & Collection | Admin |
| Salary Management | Admin |
| Leave Requests & Approvals | All |
| Transport Management (bus, driver, routes) | Super Admin |
| Class Diary / Diary Monitoring | Teacher, Student, Parent, Super Admin |
| Messaging | All |
| AI Chat Assistant | All |
| Announcements | Admin, Teacher |
| School Settings & Logo | Admin, Super Admin |
| Admission Applications (public) | Public |
| Marketing Website (home, solutions, contact, careers, demo) | Public |
| PWA Install (Android + iOS) | All |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ |

---

## Getting Started

### Backend (Spring Boot)

```bash
cd server

# 1. Create the database
psql -U postgres -c "CREATE DATABASE schoolers;"

# 2. Configure environment (copy and edit)
cp src/main/resources/application.properties.example \
   src/main/resources/application.properties
# Set spring.datasource.url, username, password, jwt.secret, mail.*

# 3. Run
mvn spring-boot:run
```

The API starts on `http://localhost:8080`.

On first startup, `DataInitializer` seeds an `APPLICATION_OWNER` account:
- **Email:** `superadmin@schoolers.com`  
- **Password:** `SuperAdmin@123`

> Change these credentials immediately via School Settings after first login.

---

### Frontend (React + Vite)

```bash
cd client

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit VITE_API_URL=http://localhost:8080

# 3. Start dev server
npm run dev
```

App runs on `http://localhost:5173`.

---

## Environment Variables

### Backend (`server/src/main/resources/application.properties`)

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/schoolers
spring.datasource.username=postgres
spring.datasource.password=your_password

# JWT — must be at least 32 characters
jwt.secret=YourSuperSecretKeyThatIsAtLeast32Characters
jwt.expiration=86400000

# Mail (for OTP / notifications)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your@email.com
spring.mail.password=your_app_password

# Owner seed account (optional override)
app.owner.email=superadmin@schoolers.com
app.owner.password=SuperAdmin@123
app.owner.mobile=9000000000
```

### Frontend (`client/.env.local`)

```env
VITE_API_URL=http://localhost:8080
```

> **Note:** Never commit `.env.local` or `application.properties` containing real credentials. Both are gitignored by default.

---

## Running Tests

### Frontend (Vitest + React Testing Library)

```bash
cd client

# Run all tests once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Coverage:** `client/coverage/index.html`

### Backend (JUnit 5 + Mockito)

```bash
cd server

# Run all tests
mvn test

# Run a specific test class
mvn test -Dtest=AuthServiceTest

# Run with verbose output
mvn test -pl . -Dsurefire.useFile=false
```

**Reports:** `server/target/surefire-reports/`

**Test counts:**
- Frontend: **95 tests** (api service, AuthContext, ProtectedRoute, InstallPrompt, Login, HomePage)
- Backend: **42 tests** (JwtUtil ×15, AuthService ×9, AuthController ×9, AdminController ×9)

---

## Deployment

### Docker (Backend)

```bash
cd server
docker build -t my-skoolz-api .
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/schoolers \
  -e JWT_SECRET=your_secret \
  my-skoolz-api
```

### Render.com (current production)

- **Backend:** Deployed as a Web Service from the `server/` directory. Environment variables set in the Render dashboard.
- **Frontend:** Deployed as a Static Site from the `client/` directory. Build command: `npm run build`. Publish directory: `dist`.

---

## Role Hierarchy

```
APPLICATION_OWNER      ← Platform level (one account, manages all schools)
    └── SUPER_ADMIN    ← School owner (one per school, creates admins)
            └── ADMIN  ← Module admin (created by SUPER_ADMIN)
                ├── TEACHER
                └── STUDENT / PARENT
```

**Role mapping to login screens:**

| Screen | Roles |
|--------|-------|
| `/login` (role selector) | Super Admin, Admin, Teacher, Student |
| `/owner-login` | APPLICATION_OWNER |

---

## API Overview

All API endpoints are prefixed with `/api`. JWT token must be sent as `Authorization: Bearer <token>` for authenticated routes.

| Prefix | Access |
|--------|--------|
| `/api/auth/**` | Public |
| `/api/applications` | Public (admission form) |
| `/api/marketing/**` | Public |
| `/api/admin/**` | ADMIN, SUPER_ADMIN, APPLICATION_OWNER |
| `/api/teacher/**` | TEACHER, ADMIN, SUPER_ADMIN, APPLICATION_OWNER |
| `/api/superadmin/**` | SUPER_ADMIN, APPLICATION_OWNER |
| `/api/schools/**` | Authenticated |
| `/api/user/**` | Authenticated |

Key endpoints:

```
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/verify-otp
POST   /api/auth/reset-password

GET    /api/admin/dashboard/stats
GET    /api/admin/students?search=&page=0&size=10
POST   /api/admin/students
DELETE /api/admin/students/{id}

GET    /api/admin/teachers
POST   /api/admin/teachers

GET    /api/teacher/attendance
POST   /api/teacher/attendance

GET    /api/marketing/demo-bookings
POST   /api/marketing/book-demo
```

---

## Project Structure

```
client/
├── public/
│   ├── manifest.json          PWA manifest
│   └── sw.js                  Service worker
├── src/
│   ├── __tests__/             Vitest test suites
│   │   ├── setup.js           Global test setup (mocks matchMedia, serviceWorker)
│   │   ├── services/          api.test.js
│   │   ├── context/           AuthContext.test.jsx
│   │   ├── components/        ProtectedRoute, InstallPrompt
│   │   └── pages/             Login, HomePage
│   ├── components/
│   │   ├── InstallPrompt.jsx  PWA "Add to Home Screen" banner
│   │   ├── ProtectedRoute.jsx Role-based route guard
│   │   ├── Layout.jsx         App shell with sidebar
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.jsx    Auth state, login/logout, permissions
│   │   └── SchoolContext.jsx  School info context
│   ├── pages/
│   │   ├── auth/              Login, ForgotPassword, EnterOTP, ResetPassword
│   │   ├── admin/             Dashboard, Students, Teachers, Fees, …
│   │   ├── teacher/           Attendance, Homework, Marks, Schedule, …
│   │   ├── student/           Dashboard, Attendance, Exams, Fees, …
│   │   ├── superadmin/        SetupSchool, AdminManagement, Transport, …
│   │   ├── shared/            SchoolCalendar
│   │   └── marketing/         HomePage, SolutionsPage, ContactUs, …
│   ├── services/
│   │   ├── api.js             Axios instance + all API call functions
│   │   └── authService.js     Login helper (wraps api.js)
│   └── main.jsx               Entry point + service worker registration

server/
├── src/main/java/com/schoolers/
│   ├── config/
│   │   ├── SecurityConfig.java   JWT + Spring Security filter chain
│   │   ├── CorsConfig.java       CORS for localhost:5173, 3000, 3001
│   │   ├── DataInitializer.java  Seeds APPLICATION_OWNER on first run
│   │   └── DatabaseMigration.java Schema patches (constraint fixes)
│   ├── controller/            REST controllers (AuthController, AdminController, …)
│   ├── service/               Business logic (AuthService, AdminService, …)
│   ├── repository/            Spring Data JPA repositories
│   ├── model/                 JPA entities (User, Student, Teacher, …)
│   ├── dto/                   Request/response DTOs
│   └── security/
│       ├── JwtUtil.java       Token generation, validation, claims
│       ├── JwtFilter.java     OncePerRequestFilter — extracts Bearer token
│       └── UserDetailsServiceImpl.java
├── src/test/java/com/schoolers/
│   ├── security/JwtUtilTest.java     (15 tests — all pass)
│   ├── service/AuthServiceTest.java  (9 tests — all pass)
│   ├── controller/
│   │   ├── AuthControllerTest.java   (9 tests — all pass)
│   │   └── AdminControllerTest.java  (9 tests — all pass)
│   └── resources/
│       ├── application-test.properties  H2 datasource for tests
│       └── mockito-extensions/          Inline mock maker config

```
