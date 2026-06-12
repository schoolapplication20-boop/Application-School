# My-Skoolz — Engineering Audit Report (v2)

**Date:** 2026-06-11
**Supersedes:** the 2026-06-10 audit below this one's findings list (kept resolved
items visible for traceability).
**Scope:** Backend (Spring Boot), Web client (React/Vite), Mobile (Expo/React
Native), DevOps/Infra, Database.
**Method:** 5 parallel deep-dive reviews (backend security/quality, frontend
UI/UX, mobile, DevOps/infra, database/performance) plus build verification.

---

## Resolved since the 2026-06-10 audit

The following items from the previous audit are now fixed (confirmed in this
session or the prior one):

- **H1 (bundle size)** — `App.jsx` now uses `React.lazy` + `Suspense` for all
  72 page routes.
- **H5 (`getCurrentSchoolId` duplication)** — extracted to
  `security/CurrentUserUtil.java`, used by 8 controllers.
- **H6 (no mobile push)** — `expo-notifications` implemented, with
  tap-to-navigate routing per role.
- **H3 (bulk delete in `deleteClass`)** — replaced with batch
  `deleteByXIn` repository methods.
- **M2/M3 (N+1 in fee-assign / hall-ticket generation)** — batched.
- **M6 (no migration tool)** — Flyway introduced (`V1`, `V2`), though
  `pre-validate.sql` legacy script still runs alongside it (see L14 below).
- **M9 (no shared error/toast pattern)** — attempted via `ToastContext`/
  `useApiCall`, but neither had any real consumers — both were **deleted**
  as dead code this session. The underlying problem (M9) is therefore still
  open; see H8 below for a fresh approach.
- **L1/L2 (Message IDOR / spoofable sender)** — fixed: `markAsRead` now
  checks ownership, `sendMessage` derives sender from `Authentication`.
- **L3 (hardcoded owner password fallback)** — replaced with
  `SecureRandom`-generated password.
- **L6 (`attendanceStore.js` dead code)** — deleted; exports relocated to
  `utils/exportUtils.js`.

Everything below is the **current** state as of this session's review.

---

## Critical

| # | Area | Location | Issue | Fix |
|---|------|----------|-------|-----|
| C1 | Database | All tenant-scoped tables (Teacher, ClassRoom, Fee, Salary, Expense, Timetable, Assignment, LeaveRequest, HallTicket, Certificate, ExamSchedule, Holiday, SchoolEvent, Announcement, ClassDiary, transport tables) | No index on `school_id`, the column nearly every query filters on. Forces full table scans as schools grow. | Add `CREATE INDEX IF NOT EXISTS ... (school_id)` via new Flyway migration `V3`. |
| C2 | Mobile security | `mobile/src/services/api.js`, `LoginScreen.js`, `AuthContext.js` | JWT + user object stored in plaintext `AsyncStorage` — readable on rooted/jailbroken devices. | Migrate to `expo-secure-store`. |
| C3 | DevOps / CI | `.github/workflows/ci.yml` | CI runs tests/build but has no deploy gate — passing CI doesn't guarantee what ships. | Add deploy job, or confirm Railway auto-deploy is gated on CI success + branch protection. |

## High

| # | Area | Location | Issue | Fix |
|---|------|----------|-------|-----|
| H1 | Backend | `db/migration/` (only V1, V2) vs `application.properties` `ddl-auto=validate` | Indexes documented in a prior security commit were never materialized — Hibernate doesn't create schema with `validate`, and no migration adds them. Same root cause as C1. | Same Flyway `V3` migration as C1. |
| H2 | Backend | `SchoolController.java:70,141,274` | `createSchool`/`updateSchool`/`updateLogo` catch `Exception` and return `e.getMessage()` to the client — leaks internals, bypasses `GlobalExceptionHandler`. | Remove local catch blocks; let `GlobalExceptionHandler` produce sanitized response. |
| H3 | Backend | ~28 controllers (Admin, Salary, OnlineExam, Leave, etc.) | Endpoints take `@RequestBody Map<String,Object>` with manual parsing (`str()`, `decimal()`, `intVal()`) instead of validated DTOs. | Introduce typed DTOs + `@Valid` for highest-risk write endpoints first (fees, salary, exams, students). |
| H4 | Database | `Student.java`, `Teacher.java`, `ClassRoom.java`, `Fee.java` | `school_id` nullable on core entities — risk of cross-tenant orphaned rows / data leakage via `*OrNull` query variants (`ExamScheduleRepository`). | Backfill nulls (run the SQL audit query first), then enforce `NOT NULL`. |
| H5 | Database | `AdminService.java:2494-2503` (`getClassAttendanceSummaries`) | N+1 — one query per classroom for dashboard load. | Replace with single `GROUP BY class_id, status` aggregate query. |
| H6 | Database / Tenant isolation | `TransportService.java` (7 methods: bus/route/driver/stop/assignment/fee/student-transport) | `findAll()` with **no school_id filter and no pagination** — cross-tenant data exposure + scale risk. | Replace with `findBySchoolId(schoolId, pageable)`. |
| H7 | Database / Tenant isolation | `TimetableService.java:22,141` | Same `findAll()` issue — all schools' timetables returned. | Use existing `findBySchoolId(schoolId)` + pagination. |
| H8 | Frontend | 31 page files (`pages/admin/*`, `pages/teacher/*`, etc.) | `Toast.jsx` pattern (state + timer + keyframes) duplicated ~15 lines per file. | Extract `useToast()` hook + single `<ToastViewport>` in `Layout.jsx`. (Replaces the dead `ToastContext` removed this session.) |
| H9 | Frontend | `dark.css` tokens vs ~5,290 inline `style={{}}` blocks across portal pages | Dark mode CSS variables exist but inline hex colors bypass them — dark mode incomplete on data pages. | Migrate inline colors to `var(--text-primary)` etc., page by page. |
| H10 | Frontend | 12+ button class conventions (`.btn-primary`, `.action-btn-edit`, `.exam-action-btn`, etc.) | No shared `Button` component — visual inconsistency. | Consolidate into one `Button` component with variants. |
| H11 | Frontend | `pages/admin/Teachers.jsx` | No loading state/skeleton — blank table flash. | Add `loading` state + `SkeletonLoader`. |
| H12 | Frontend | `Students.jsx` (1832 lines), `Transport.jsx` (1591), `Teachers.jsx` (1393), `Timetable.jsx` (1332), `Examination.jsx` (1069) | Monolithic page components, minimal memoization (13/46 use `useMemo`/`useCallback`). | Split into table/modal/filter subcomponents; memoize derived lists. |
| H13 | Mobile | Feature parity (Student) | No mobile equivalent for Online Exam Taking, Appointments, Report Card, School Calendar. | Prioritize Online Exam taking first. |
| H14 | Mobile | Feature parity (Teacher) | No mobile equivalent for Online Exams (create/grade), Appointments, Self-Attendance, Homework, My Students. | Prioritize Online Exam grading + self-attendance. |
| H15 | Mobile | Feature parity (Admin) | 10 of 18 web admin pages have no mobile screen (Online Exams Admin, Classes, Teachers, Timetable, Transport, Fees, Expenses, Salaries, Settings, Examination). | Backlog; surface read-only Fees/Examination/Timetable first. |
| H16 | DevOps | `server/Dockerfile` | Final stage runs as root, no `HEALTHCHECK`. | Add non-root user + `HEALTHCHECK`. |
| H17 | DevOps | `client/.env`, `client/.env.production`, `server/.../application.properties` | Tracked in git despite being in `.gitignore` (added after initial commit). Currently no live secrets in them, but pattern is risky. | `git rm --cached`, verify history, document env-var-only policy. |
| H18 | DevOps | `client/package.json` — `xlsx@^0.18.5` | High-severity prototype pollution + ReDoS, no fix available on npm registry version. | Migrate to SheetJS CDN-hosted patched build or `exceljs`. |
| H19 | DevOps | `server/.../FileStorageService.java` | Local-disk upload fallback (`./uploads/logos/`) — Railway filesystem is ephemeral, files lost on redeploy. | Make Cloudinary mandatory in prod; remove local fallback for prod profile. |

## Medium

| # | Area | Location | Issue | Fix |
|---|------|----------|-------|-----|
| M1 | Backend | `OnlineExamService.java:536` | Unhandled `NumberFormatException` on malformed `questionId` → generic 500. | Wrap in try/catch, return validation error. |
| M2 | Backend | `AdminService.java` (2891 lines, 53 methods) | God-class — students/teachers/fees/classes/exams all in one service. | Split into domain services (StudentAdminService, FeeAdminService, etc.). |
| M3 | Backend | `pom.xml` — `jjwt` 0.11.5, Spring Boot 3.2.0 | Outdated deps with available security patches. | Bump jjwt to 0.12.x, Spring Boot to current 3.3.x patch. |
| M4 | Backend | `AuthService.java` (lines 195, 273, 293, 325, 538, 563, 573) | User emails logged at INFO/WARN — PII accumulation without retention policy. | Log userId instead of email, or define retention/redaction policy. |
| M5 | Backend | `ExpenseRepository.java:56,78` | Unscoped global `SUM(amount)` query alongside school-scoped variant — risk of accidental cross-tenant use. | Rename unscoped variant clearly + guard with `@PreAuthorize`. |
| M6 | Frontend | ~23 clickable `<div>`s (AdminDashboard, Classes, Applications) | No `role="button"`/keyboard handlers — inaccessible. | Convert to `<button>` or add `role="button" tabIndex={0}` + `onKeyDown`. |
| M7 | Frontend | 12 of 24 `<table>` usages | No responsive overflow wrapper — breaks on mobile (CollectFee, Examination, ExaminationView, LeaveApproval, Schedule). | Wrap in `.table-responsive { overflow-x: auto }`. |
| M8 | Frontend | `pages/parent/` | Empty, unreferenced directory. *(Note: 2026-06-10 audit confirmed STUDENT/PARENT share the student portal by design — this empty dir is leftover scaffolding, not a missing feature.)* | Remove directory. |
| M9 | Frontend | 49 occurrences of `key={index}` | Risky for reorderable/filterable lists. | Use stable `item.id` keys. |
| M10 | Frontend | `HomePage.jsx`, `AboutUsPage.jsx` | Hotlinked Unsplash images — latency, no lazy-loading/srcset. | Self-host optimized WebP images with `loading="lazy"`. |
| M11 | Frontend | `studentService.js:57,105`, `teacherService.js:36`, `ErrorBoundary.jsx:14` | `console.error` left in production code. | Route through gated logging utility. |
| M12 | Frontend | `Students.jsx` form inputs | ~6 of 19 inputs lack label/aria-label. | Add `<label htmlFor>`/`aria-label`. |
| M13 | Mobile | `useCachedFetch.js:22-47` | Stale-while-revalidate with no TTL, no reconnect listener, no invalidation. | Add `NetInfo` reconnect listener + "last updated" timestamp. |
| M14 | Mobile | Write operations (attendance, messages, leave) | No offline queue — fail with Alert when offline. | Disable writes when offline, or implement write queue. |
| M15 | Mobile | 25/34 screens use `.map()` in `ScrollView` instead of `FlatList` | Risk for large rosters/history lists. | Convert high-volume lists to `FlatList`. |
| M16 | Mobile | 0/34 screens use `RefreshControl` | No manual refresh — combined with M13, data can be stale indefinitely. | Add `RefreshControl` wired to `reload()`. |
| M17 | Mobile | `AppNavigator.js`, `app.json` | No `linking`/`scheme` config — no deep linking for password reset/message links. | Add `scheme` + `linking` config. |
| M18 | Mobile | `app.json`/`eas.json` | No `expo-notifications` config plugin, no Android notification icon/color, no `eas submit` profile. | Add plugin config + submit profile before store submission. |
| M19 | DevOps | repo-wide | No Sentry/APM/Actuator — errors only visible via logs. | Add Sentry SDK (backend + client) + `spring-boot-starter-actuator`. |
| M20 | Database | ~28 `findBySchoolId...` repo methods returning `List<>` (FeePayment, Marks, ClassDiary, Certificate, HallTicket, StudentFeeAssignment) | Unbounded per-tenant lists — fine short-term, large for established schools. | Convert hot paths (fee payments, marks, diary) to `Page<>` per the Message/Leave pattern. |
| M21 | Database | FK columns (`teacher_id`, `student_id`, `class_id`, `assignment_id`) on Salary, Certificate, FeeInstallment, FeePayment, Assignment, AssignmentSubmission | Postgres doesn't auto-index FKs — joins/filters scan. | Add indexes on high-traffic FK columns (same V3 migration as C1). |
| M22 | Database | repo-wide | No caching layer — even static reference data (chatbot FAQs, exam types, grade scales) hits DB every time. | Add `@Cacheable` (Caffeine) for low-churn reference data. |
| M23 | Database | `application.properties:21-26` | HikariCP has no `leak-detection-threshold`. | Add `spring.datasource.hikari.leak-detection-threshold=30000`. |
| M24 | Database | `ExamScheduleRepository.java:27,30,33` | `*OrNull` query variants exist to handle legacy null `school_id` rows — perpetuates H4. | Remove after H4 backfill/NOT NULL enforced. |
| M25 | DevOps | `mobile/.gitignore` | Only ignores `.env*.local`, not bare `.env`. | Add `.env`/`.env.*` (except `.env.example`) to `mobile/.gitignore`. |
| M26 | DevOps | `mobile/package.json` | 13 npm audit findings (12 moderate, 1 critical), all transitive via `@expo/config-plugins → xcode → uuid` (build tooling, not shipped runtime). | `npx expo install --check` / upgrade Expo SDK patch. |
| M27 | DevOps | `server/pom.xml` — `bucket4j-core` 7.6.0 | Legacy abandoned groupId (`com.github.vladimir-bukhtoyarov`). | Migrate to `com.bucket4j:bucket4j-core:8.x`. |
| M28 | DevOps | `.github/workflows/ci.yml` | Never builds the production Docker image — Dockerfile breaks not caught by CI. | Add `docker build` step for `server/`. |

## Low

| # | Area | Location | Issue | Fix |
|---|------|----------|-------|-----|
| L1 | Backend | `OnlineExamService.java:227,281` | Direct `(String)` cast on `correctAnswer` — `ClassCastException` on non-string input. | Use safe `str()` helper. |
| L2 | Backend | `application.properties` — `jwt.expiration=7200000` | No refresh-token mechanism documented. | Document/implement refresh-token rotation if needed for mobile UX. |
| L3 | Backend | `SalaryService`, `TransportService`, others | Duplicated `str()`/`intVal()`/`decimal()` helpers. | Extract to shared `MapUtils`. |
| L4 | Frontend | `pages/shared/ReportCardHub.jsx:274` | Generated `<img>` in print template has no `alt`. | Add `alt="School logo"`. |
| L5 | Frontend | Marketing vs portal styling | Marketing uses className/CSS, portal uses 5,290+ inline styles — two philosophies in one app. | Gradual migration toward token-based CSS (tracked under H9). |
| L6 | Frontend | `ProtectedRoute.jsx` | "Module disabled"/"Access denied" cards redefine the "premium empty state" pattern inline. | Extract shared `EmptyStateCard`. |
| L7 | Mobile | `mobile/assets/` | Only 4 reused PNGs; icon/adaptive-icon/splash appear to be the same low-res source. | Verify/regenerate store-compliant icon set (1024×1024). |
| L8 | Mobile | `mobile/package.json` | No `expo-secure-store`, no `@react-native-community/netinfo`, no test/lint tooling. | Add as part of C2/M13 work. |
| L9 | Mobile | Error handling | All write-action errors show generic message regardless of cause (network vs validation vs 401). | Shared `getErrorMessage(err)` helper. |
| L10 | Database | `service/OnlineExamService.java:174-176,576-585` | Per-attempt delete/grading loops — fine at current scale, degrades for large cohorts. | Bulk `deleteByExamId`, batch-fetch answers. |
| L11 | Database | `TransportService`, `MessageService` | Only 6 of TransportService's multi-step write methods are `@Transactional`. | Audit and add `@Transactional(rollbackFor=Exception.class)`. |
| L12 | Database | `db/pre-validate.sql:11-12` | Two unguarded `ALTER COLUMN ... TYPE VARCHAR(50)` re-run every startup. | Migrate into versioned Flyway migrations, retire script. |
| L13 | DevOps | `.github/workflows/db-backup.yml` | Solid B2 backup pipeline exists but undocumented (no restore runbook). | Add "Backup & Restore" section to README. |
| L14 | DevOps | `application.properties` (Flyway + `pre-validate.sql`) | Two parallel schema-management mechanisms. | Retire `pre-validate.sql` once environments confirmed caught up. |

---

## Overall Assessment

My-Skoolz is a **mature, working product** with a track record of real
incremental improvement (see "Resolved since 2026-06-10" above) — not a
greenfield build, and not a legacy mess either. It already has broad feature
coverage, multi-tenant RBAC, a recent 54-issue security pass, CI with
backend/frontend/E2E tests, structured logging, and an automated offsite
backup pipeline.

The remaining gaps are concentrated in **follow-through and consistency**:
- A previous security pass *documented* indexes that were never actually
  created (C1/H1) — the single highest-leverage fix, since it underlies
  dashboard performance everywhere.
- Multi-tenant scoping is excellent in most services but has real holes
  (H6/H7 — Transport/Timetable `findAll()` with no school filter at all).
- The frontend has good bones (lazy-loading, dark-mode tokens, feature-flagged
  nav) but inconsistent execution (inline styles defeating dark mode, 12
  button styles, duplicated toast logic).
- Mobile covers ~30-40% of web functionality and has one real production
  blocker (plaintext token storage).

## Roadmap (Phases)

1. **Phase 1 — Critical/High fixes, foundational**: C1/H1 (index migration),
   C2 (mobile SecureStore), H2 (info disclosure), H6/H7 (tenant-scoped
   Transport/Timetable queries), H5 (N+1 dashboard query), H16/H17
   (Docker hardening, secrets hygiene).
2. **Phase 2 — Frontend design system**: H8 (shared toast), H10 (Button
   component), H11/H12 (loading states, split monolith pages), H9 (complete
   dark mode).
3. **Phase 3 — Backend architecture**: H3 (DTO validation layer), M2 (split
   `AdminService`), M20 (pagination on remaining lists).
4. **Phase 4 — Mobile parity**: H13-H15 (module parity), M13-M18 (offline,
   FlatList, refresh, deep links, store config).
5. **Phase 5 — DevOps/observability**: M19 (Sentry/Actuator), M26-M28
   (dependency upgrades), C3/M28 (CI deploy gate + Docker build check).
6. **Phase 6 — Testing & docs**: expand coverage on refactored services,
   update README/deployment docs, document backup/restore (L13).

This document will be updated as items are resolved.
