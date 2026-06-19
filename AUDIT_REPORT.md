# My-Skoolz — Engineering Audit Report (v3)

**Date:** 2026-06-19  
**Supersedes:** v2 (2026-06-11)  
**Scope:** Backend (Spring Boot), Web client (React/Vite), Database, SMS/Notification module  
**Method:** 9 parallel deep-dive agents (Security/auth, Business-logic, API-contract, Java/N+1,
React/state, Multi-tenant, Error-handling, Architecture/duplication, SMS/Notification) +
session-based manual review of all fee-collection changes.

---

## Resolved since v2 (this session)

| # | What was fixed | Commit |
|---|----------------|--------|
| R1 | Mobile responsiveness — full CSS overhaul; all pages adapt to 360-1440 px | `e3e8bb0` |
| R2 | Android inline-grid overflow — attribute-selector overrides for `repeat(N,1fr)` | `2340bbf` |
| R3 | Dashboard mobile overflow — `min-width:0` on grid items, missing `repeat(5,1fr)` rules | `bc06816` |
| R4 | Exam schedule modal overflow — `overflow-x:auto` scroll wrapper, footer stacking | `5f5715e` |
| R5 | Fee installment carry-over not cleared on full repayment | `a3b4195` |
| R6 | Receipt number regenerated on payment failure (stale-state duplicate) | `a3b4195` |
| R7 | Status labels: "Partial" → "Partially Paid", "Pending" → "Unpaid" | `a3b4195` |
| R8 | V8 Flyway migration — drops any multi-column unique constraints on `fee_payments` / `fee_installments` | `bd70ea4` |
| R9 | Receipt generated server-side (UUID); frontend value ignored; `payingRef` double-submit guard | `5d8e0b7` |

---

## Critical — Security & data integrity

### SEC-01 · Multi-tenant message IDOR (cross-school read/write)

**Files:** `MessageService.java:36,40,144`, `MessageController.java:56`  
**Severity:** Critical — PII exposure, cross-tenant write  

`getMessagesForUser()` and `getConversation()` perform no school-boundary check; the controller's
`isOwnerOrAdmin()` guard returns `true` for any ADMIN regardless of which school the target users
belong to. `markReadForStudent()` fetches a message by ID with no schoolId filter, letting any
authenticated student corrupt another school's unread state.

**Fix:**  
```java
// getConversation: verify both participants belong to caller's school
// getMessagesForUser: add AND m.schoolId = :schoolId to the repository query
// markReadForStudent: compare message.schoolId == student.schoolId before mutation
```

---

### SEC-02 · APPLICATION_OWNER `schoolMismatch` bypass — unrestricted write to all schools

**File:** `AdminService.java:89`  
**Severity:** Critical — owner can silently alter any school's students, fees, teachers

`schoolMismatch(null, anyId)` always returns `false`, so the owner passes every tenant-isolation
check on every `/api/admin` endpoint. These writes are unaudited.

**Fix:** Add an explicit `APPLICATION_OWNER` audit path; reject or audit-log cross-school writes
rather than silently permitting them.

---

### SEC-03 · Broadcast message schoolId injection by APPLICATION_OWNER

**File:** `MessageService.java:177`  
**Severity:** Critical — owner can broadcast phishing content to any school

When sender's `schoolId` is null (owner), the service falls back to `schoolId` from the request
body — an attacker-controlled value. A single forged POST can push a school-wide broadcast to
any school ID.

**Fix:** Require explicit confirmation/admin-selected school for owner broadcasts; never trust
body-supplied `schoolId` when the sender is the platform owner.

---

### SEC-04 · Certificate lookup has no school ownership check

**File:** `ExaminationService.java:304`  
**Severity:** Critical — any authenticated staff can read any student's PII certificate

`findByCertificateId(certId)` resolves by the public cert string (`BON26XXXXXX`) with no school
filter. Every other certificate endpoint is school-scoped; this one is not.

**Fix:** Add `AND c.schoolId = :schoolId` to the lookup or compare post-fetch.

---

### SEC-05 · Notifications IDOR — ADMIN can read/clear any user's notifications cross-school

**File:** `AppNotificationController.java:41,75`  
**Severity:** Critical — information disclosure + cross-school state mutation

`GET /api/notifications?userId=N` and `PATCH /api/notifications/read-all?userId=N` accept userId
as a caller-supplied param. The `isOwnerOrAdmin` guard only checks role, not whether the target
user belongs to the caller's school.

**Fix:** Derive userId from JWT principal in the controller; reject any body-supplied userId that
doesn't match the caller's school.

---

### SEC-06 · AES encryption key falls back to hardcoded default

**File:** `AesEncryptionUtil.java:27`, `application.properties`  
**Severity:** Critical — any deployment missing `ENCRYPTION_KEY` uses the well-known key `my-skoolz-local-dev-key`, exposing all stored SMS auth keys

**Fix:** Throw a startup exception if `ENCRYPTION_KEY` is absent or equals the default; never
silently fall back.

---

### SEC-07 · User entity serializes sensitive security fields

**File:** `User.java:107`  
**Severity:** Critical — `resetOtp`, `otpExpiry`, `failedLoginAttempts`, `lockedUntil`, `pushToken` leak on any endpoint that returns a `User` object directly

**Fix:** Annotate all five fields with `@JsonIgnore`.

---

### SEC-08 · ExamSchedule repository uses `OR schoolId IS NULL` — cross-tenant data bleed

**File:** `ExamScheduleRepository.java:26-33`  
**Severity:** Critical — legacy null-schoolId rows are visible to every tenant

**Fix:** Remove the `OR schoolId IS NULL` clause after H4 backfill (below); add a startup
assertion that no null rows remain.

---

## High — Business logic & data integrity bugs

### BUG-01 · `updateFee` can zero `paidAmount` without resetting status to PENDING

**File:** `AdminService.java:1627`

When `paidAmount` is set to 0 via `PUT /fees/{id}`, the status stays `PAID` because the
condition never assigns `PENDING`. A fully refunded fee is misrepresented as paid.

**Fix:**
```java
if (newPaid >= total)       assignment.setStatus(PAID);
else if (newPaid > 0)       assignment.setStatus(PARTIAL);
else                        assignment.setStatus(PENDING);  // ← missing branch
```

---

### BUG-02 · Term-wise fee split allows under-total (only blocks over-total)

**File:** `AdminService.java:1757`

Validation rejects `termTotal > annualTotal` but silently accepts `termTotal < annualTotal`,
making full installment payment structurally impossible.

**Fix:** Change `>` to `!=` in the comparison, or validate `termTotal == annualTotal`.

---

### BUG-03 · `deleteStudentFeeAssignment` orphans `fee_installments` and `fee_payments`

**File:** `AdminService.java:1904`

`deleteById` removes only the parent row. Child rows with a now-dangling FK remain and
inflate revenue reports indefinitely.

**Fix:** Call `feeInstallmentRepository.deleteByAssignmentId(id)` and
`feePaymentRepository.deleteByAssignmentId(id)` (repository method already exists) before
deleting the assignment.

---

### BUG-04 · `deleteClassFeeStructure` leaves student assignments at stale fee amount

**File:** `AdminService.java:1818`

Deleting a `ClassFeeStructure` does not touch derived `StudentFeeAssignment` rows.
If admin creates a corrected structure, `syncClassFeeAssignment` skips existing 2024-25
rows, so students owe the old inflated amount forever.

**Fix:** When a structure is deleted, cascade-update or null-out the linked student
assignments, or explicitly warn the admin and provide a re-sync action.

---

### BUG-05 · Financial deletions write no audit log

**Files:** `AdminService.java:1661` (`deleteFee`), `1818` (`deleteClassFeeStructure`), `1904` (`deleteStudentFeeAssignment`)

Unlike `deleteStudent` and `deleteTeacher` (both call `auditLogService.log()`), the three
financial deletion paths are completely unaudited.

**Fix:** Add `auditLogService.log(ADMIN, "DELETE", "FEE", id, ...)` before each delete.

---

### BUG-06 · `deleteClass` cascades to 40+ rows but writes no audit log

**File:** `AdminService.java:1329`

Bulk deletion of an entire class plus all students, fees, attendance, marks, and assignments
in one `@Transactional` call produces no audit entry.

**Fix:** Capture the class and student list before deletion; log each entity type.

---

### BUG-07 · `getStudentFeeData` returns stale prior-academic-year assignment

**File:** `AdminService.java:2268`

`findFirstByStudentIdOrderByCreatedAtDesc(studentId)` is not scoped to the current academic
year. Students who don't yet have a 2025-26 assignment see last year's data as if it were
current.

**Fix:** Filter by current academic year:
`findFirstByStudentIdAndAcademicYearOrderByCreatedAtDesc(studentId, currentYear)`.

---

### BUG-08 · `assignStudentFee` lookup not scoped to `schoolId`

**File:** `AdminService.java:1951`

`findByStudentIdAndAcademicYear(studentId, year)` has no school filter. In a multi-tenant
deployment with a student-ID collision, one school can overwrite another's fee assignment.

**Fix:** Use `findByStudentIdAndAcademicYearAndSchoolId(studentId, year, schoolId)`.

---

### BUG-09 · `markAttendance` not `@Transactional` — partial saves on failure

**File:** `TeacherService.java:315`

A failure at student #25 of 40 leaves the first 24 attendance records permanently committed
with no rollback. Re-submission creates duplicate conflicts for those 24.

**Fix:** Add `@Transactional(rollbackFor = Exception.class)`.

---

### BUG-10 · Malformed `paidDate` silently reuses the fee's prior paid date

**File:** `AdminService.java:1572`

`catch (Exception ignored)` swallows a `LocalDate.parse` failure and falls through to
`fee.getPaidDate()`, recording the new payment on the wrong historical date.

**Fix:** Return `ApiResponse.error("Invalid payment date format")` in the catch block instead
of ignoring.

---

### BUG-11 · Hardcoded grade scale in bulk CSV marks import

**File:** `ReportCardController.java:223`

The CSV import uses a hardcoded O/A+/A/B+/B/C/F ladder and ignores the school's
configurable `GradeScale` table. Schools with custom grading silently get wrong grades.

**Fix:** Load the school's `GradeScale` records and apply them during CSV import, matching
the same logic used by the interactive marks entry.

---

### BUG-12 · `LATE` and `HOLIDAY` attendance statuses silently dropped from summary

**File:** `AdminService.java:2650`

The `switch` in `getClassAttendanceSummaries` has no `case` for `LATE` or `HOLIDAY`,
so they are excluded from the `total` count. Dashboard totals are wrong whenever these
statuses are used.

**Fix:** Add cases for `LATE` and `HOLIDAY` (or route them to an `"others"` bucket).

---

### BUG-13 · Teacher can broadcast to any class section (enforcement missing)

**File:** `MessageService.java:190-195`

The block that should restrict a teacher to their own assigned class section is commented
out. Any teacher can broadcast to any class in the school.

**Fix:** Re-implement the class-section check using `TeacherClassAssignment` records.

---

### PERF-01 · N+1 query in `getClasses()` — one COUNT per classroom

**File:** `AdminService.java:1155`

`studentRepository.countEnrolledForCapacity()` is called inside a `stream().map()` over
all classrooms, issuing 31 round-trips for a 30-class school.

**Fix:** Replace with a single `GROUP BY class_id` aggregate query or a batch
`countByClassIdIn(classIds)` call.

---

### PERF-02 · N+1 INSERTs in `saveClassFeeStructure → applyTermInstallments`

**File:** `AdminService.java:1803`

Per-student, per-term `feeInstallmentRepository.save()` calls issue 180 individual INSERTs
for 60 students × 3 terms. Risks transaction timeout on large classes.

**Fix:** Collect all `FeeInstallment` objects into a list and call
`feeInstallmentRepository.saveAll(list)`.

---

### PERF-03 · N+1 DELETEs in `deleteTeacher`

**File:** `AdminService.java:1072`

`deleteByAssignmentId()` is called per-assignment in a `forEach` loop.
`deleteByAssignmentIdIn()` already exists in the repository but is unused here.

---

### PERF-04 · `updateTeacher` missing `@Transactional` — three disjoint saves

**File:** `AdminService.java:966`

`userRepository.save()`, `teacherRepository.save()`, and `syncPrimaryClassAssignment()`
are three separate DB writes with no transaction boundary. A failure mid-sequence leaves
the `User` and `Teacher` tables inconsistent.

**Fix:** Add `@Transactional(rollbackFor = Exception.class)`.

---

### PERF-05 · Missing `student_id` index on `attendance` table

**File:** `Attendance.java:16`

The table indexes `(school_id, class_id, date)` but not `student_id`. Both
`deleteByStudentId()` and `findByStudentId*()` do a full table scan — costly inside the
`@Transactional` `deleteStudent()` cascade.

**Fix:** Add `CREATE INDEX idx_attendance_student_id ON attendance(student_id)` to the next
Flyway migration.

---

## Medium — SMS/Notification security

### SMS-01 · WhatsApp webhook verify token hardcoded

**File:** `WhatsAppCloudService.java:28`  
Default fallback: `myskoolz2026`. Any deployment missing `WHATSAPP_VERIFY_TOKEN` leaks
endpoint existence to anyone who reads the source code.

**Fix:** Throw on startup if the token equals the default or is absent (same pattern as SEC-06).

---

### SMS-02 · Arbitrary phone targeting via CUSTOM target type

**File:** `SmsService.java:124`  
Admins can supply an unbounded list of arbitrary E.164 numbers with no allow-list or
restriction to the school's registered parents. Risk: SMS spam/phishing under the school's
registered Sender ID — potential regulatory violation.

**Fix:** For `CUSTOM` targets, validate each number is present in the school's `students`
or `contacts` table, or require `OWNER` role for unrestricted targeting.

---

### SMS-03 · Unbounded `customPhones` list — single request can drain SMS quota

**File:** `SmsBulkSendRequest.java:30`  
No `@Size` constraint. One request can enqueue tens of thousands of rows, bypassing the
per-IP rate limit because it's a single request.

**Fix:** `@Size(max = 500)` on `customPhones`; add a per-school daily SMS budget check.

---

### SMS-04 · SMS template variable injection (newline smuggling)

**File:** `SmsTemplateService.java:99`  
`render()` substitutes `{{name}}` without stripping `\n`/`\r`. A student named
`Alice\nFrom: BANK\nYour OTP is 1234` injects extra lines into the rendered message body.

**Fix:** Strip all control characters from substituted values before rendering.

---

### SMS-05 · Unmasked parent phone numbers in `/api/sms/history`

**File:** `SmsService.java:309`  
The history endpoint returns raw `SmsLog` entities including full E.164 parent phone
numbers to any ADMIN-role user in the school, regardless of their function (fee clerk,
HR, etc.). A LIKE-wildcard search parameter enables efficient enumeration.

**Fix:** Project to a DTO that masks numbers (`+91-XXXXX-XX789`); scope search to
the requesting admin's own sent-messages only.

---

### SMS-06 · Rate limiting is IP-only, no per-school budget gate

**File:** `RateLimitingInterceptor.java:95`  
30 requests/10 min per IP, but no per-school daily/monthly SMS budget cap. The queue
processor has no school-level throttle at all. A compromised admin with a VPN bypasses
the IP bucket entirely.

**Fix:** Track per-school daily SMS count in Redis/DB; reject sends above a configurable
school budget.

---

## Medium — Frontend API contract bugs

### API-01 · `CURRENT_YEAR` uses calendar-year arithmetic; server uses fiscal-year (April cutoff)

**Files:** `Fees.jsx:9`, `AdminService.java` (current academic year logic)  
January → March: client sends `2026-27`, server expects `2025-26`. Fee structures and
assignments are saved to the wrong academic year for three months each year.

**Fix:** Move academic-year computation to a shared utility that matches the server's
April-cutoff logic, or fetch `currentAcademicYear` from the API on page load.

---

### API-02 · Receipt hardcoded as "Amount Received (Cash)" in print template

**File:** `CollectFee.jsx:321`  
The printed receipt always reads "Cash" regardless of the selected payment mode. On-screen
display correctly reads `receiptData.paymentMode` but the string is never interpolated into
the print template.

**Fix:** Replace the hardcoded string with `${escHtml(d.paymentMode)}`.

---

### API-03 · Attendance note field collected in UI but never sent to backend

**File:** `Attendance.jsx:132`  
The attendance payload omits the `note` field, so teacher notes are silently discarded.
(The backend `Attendance` entity also lacks a `note` column — both sides need the addition.)

**Fix:** Add `note` column to `Attendance` entity + Flyway migration; include `note` in the
payload.

---

### API-04 · `StudentTransportPage` patches list with `null` on missing response data

**File:** `StudentTransportPage.jsx:261`  
On a successful update that returns `{ success: true, data: null }`, the code splices `null`
into the records array — broken row displayed until page refresh.

**Fix:** Re-fetch the updated record from the server on success instead of patching
optimistically with potentially-null data.

---

### API-05 · `SettingsTab` (SMS) crashes with `TypeError` when `data` field absent

**File:** `sms/SettingsTab.jsx:80`  
`res.data.data.authKeyMasked` (no optional chaining) throws when the backend returns
`{ success: true, message: 'Saved' }` without a `data` key.

**Fix:** `const s = res.data?.data; if (!s) { showToast('Saved'); return; }`.

---

### API-06 · SMS history date filter cuts off IST midnight records

**File:** `sms/HistoryTab.jsx:24`  
Frontend appends bare `T00:00:00` (no timezone) to date params. The backend stores
`createdAt` as UTC `LocalDateTime`. For IST (+5:30) users, records from midnight-to-5:30 AM
on the selected date are excluded.

**Fix:** Append `+05:30` or use `date + 'T00:00:00+05:30'` when building the query param.

---

## Medium — React state bugs

### REACT-01 · Name-search in `CollectFee` has no `AbortController` — stale response race

**File:** `CollectFee.jsx:128`  
A slow earlier query can resolve after a faster later query and overwrite suggestions with
stale results (classic TOCTOU on async fetch).

**Fix:** Create an `AbortController` per debounce tick; abort previous fetch before issuing
the new one.

---

### REACT-02 · `index` used as `key` on reorderable term-fee and installment rows

**File:** `Fees.jsx:706,862`  
`key={idx}` on lists that support remove-by-index causes React to apply the wrong diff when
a middle row is deleted — controlled inputs show in the wrong rows.

**Fix:** Assign a stable `id` (e.g., `crypto.randomUUID()`) when a row is added; use that as `key`.

---

### REACT-03 · `showToast` captured by stale closure in effects and callbacks

**Files:** `Attendance.jsx:76`, `Marks.jsx:340`  
`showToast` is called inside `useEffect`/`useCallback` with empty dependency arrays. If the
`ToastContext` updates its reference, the error toast is a no-op.

**Fix:** Add `showToast` to the dependency array; `ToastContext` should stabilize the reference
with `useCallback`.

---

### REACT-04 · Examination async delete handlers swallow errors silently

**File:** `Examination.jsx:218,318,362`  
`handleDeleteSchedule`, `handleDeleteTicket`, `handleDeleteCertificate` are `async` callbacks
with empty `catch` blocks. On API failure the UI shows no error, and if the optimistic state
update had already been applied, the list diverges from the server.

**Fix:** Add user-facing error toasts in the catch blocks; revert optimistic updates on failure.

---

## Low — Architecture & duplication

### ARCH-01 · Fee status derivation copy-pasted 5× in `AdminService`

**File:** `AdminService.java:1795,1990,2095,2234,...`  
The PAID/PARTIAL/PENDING three-way comparison is duplicated verbatim. The `2095` copy already
diverges — it never assigns PENDING, leaving a refunded assignment permanently PARTIAL.

**Fix:** Extract `deriveStatus(BigDecimal paid, BigDecimal total)` utility method; fix the
diverged copy.

---

### ARCH-02 · `FeePayment` audit record built manually in 3 separate methods

**File:** `AdminService.java:1587,2101,2239`  
`collectCashFee`, `collectAssignmentFee`, `collectInstallmentFee` each construct a
`FeePayment` independently. The assignment path was hardcoding `"CASH"` (now fixed in
`5d8e0b7`), but adding any new audit field still requires 3 edits.

**Fix:** Extract `buildFeePayment(assignment, amount, receipt, ...)` factory method.

---

### ARCH-03 · `SuperAdminDashboard.jsx` — 3,447-line god file mixing 5 unrelated screens

**File:** `SuperAdminDashboard.jsx:70`  
`OwnerDashboard`, `CreateSuperAdminWizard`, `EditSchoolWizard`, `CredentialsModal`, and
`SchoolDashboard` for two different roles share one module. State initialized for
`OwnerDashboard` (20+ `useState` calls) is never reset when `SchoolDashboard` renders.

**Fix:** Split into 5 separate page components imported via `React.lazy`.

---

### ARCH-04 · `StatusBadge` component defined 6+ times across the codebase

**Files:** `Fees.jsx`, `CollectFee.jsx`, `StudentFees.jsx`, `Expenses.jsx`, `Applications.jsx`, `AdminDashboard.jsx`  
The PARTIAL color already diverges between files. Design-token changes require 6+ manual edits.

**Fix:** Extract to `components/StatusBadge.jsx` with a single color map.

---

### ARCH-05 · `DEFAULT_SCALE` grade array duplicated across 4 files with diverging logic

**Files:** `Marks.jsx:16`, `StudentMarks.jsx`, `SchoolSettings.jsx:120`, `Assignments.jsx:7`  
`Assignments.jsx` uses hardcoded if-chain thresholds ignoring any school-configured scale;
the same score displays different grades on Marks vs Assignments. `SchoolSettings.jsx`
recreates the array inside the component function (allocated on every render).

**Fix:** Extract to `utils/gradeUtils.js`; always use the server's configured scale.

---

### ARCH-06 · Fee receipt printing via deprecated `document.write()` in a popup

**File:** `CollectFee.jsx:284`  
Raw HTML with inline hardcoded CSS is embedded as a template string in JSX — untestable,
CSP-hostile, and any receipt layout change requires editing an HTML string buried in component
code.

**Fix:** Move receipt to a hidden `<div>` with `@media print` CSS; trigger `window.print()`.

---

### ARCH-07 · `ReportCardController` queries DB for `schoolId` on every endpoint (7 selects)

**File:** `ReportCardController.java:31,50,62,77,129,144,246`  
`userRepository.findByEmailIgnoreCase(email)` is called at the top of every method instead
of reading the JWT claim via `CurrentUserUtil`.

**Fix:** Inject `CurrentUserUtil` and call `getCurrentSchoolId(auth)` once per request.

---

### ARCH-08 · `updateTeacher` returns raw `Teacher` JPA entity with nested `User` object

**File:** `AdminService.java:966`  
The API response exposes `schoolId`, `role`, `isActive`, and all `User` fields to the client.
Any future sensitive field added to `User` is automatically leaked.

**Fix:** Map to a `TeacherResponseDTO` before returning.

---

## Carry-forward from v2 (still open)

The following items from the v2 audit remain unresolved. They are not repeated in detail above
but are still outstanding:

| v2 # | Area | Brief description |
|------|------|-------------------|
| C1/H1 | Database | No `school_id` indexes — Flyway V3 migration still needed |
| C2 | Mobile | JWT in plaintext `AsyncStorage` — migrate to `expo-secure-store` |
| C3 | DevOps | CI has no deploy gate |
| H2 | Backend | `SchoolController` leaks `e.getMessage()` to client |
| H3 | Backend | 28 controllers use `Map<String,Object>` instead of validated DTOs |
| H4 | Database | `school_id` nullable on `Student`, `Teacher`, `ClassRoom`, `Fee` — backfill + NOT NULL |
| H6 | Database | `TransportService` uses `findAll()` with no school filter — cross-tenant exposure |
| H7 | Database | `TimetableService` same `findAll()` issue |
| H8 | Frontend | Toast pattern duplicated ~15 times — extract `useToast()` |
| H9 | Frontend | 5,290 inline hex colors defeat dark-mode CSS variables |
| H10 | Frontend | 12+ button class conventions — consolidate `Button` component |
| H16 | DevOps | Docker runs as root, no HEALTHCHECK |
| H17 | DevOps | `.env` files tracked in git history |
| H18 | DevOps | `xlsx@0.18.5` — high-severity prototype pollution, no npm fix |
| H19 | DevOps | Local-disk upload fallback — Railway filesystem is ephemeral |
| M2 | Backend | `AdminService.java` — 2,900-line god class |
| M3 | Backend | `jjwt` 0.11.5, Spring Boot 3.2.0 — security patch versions available |
| M19 | DevOps | No Sentry/APM/Actuator |
| M20 | Database | 28 `findBySchoolId` methods return unbounded `List<>` |
| M26 | DevOps | Expo SDK — 13 npm audit findings |

---

## Overall Assessment

My-Skoolz has a solid functional core with broad feature coverage, real Flyway migrations,
structured logging, CI, and an automated offsite backup pipeline. The fee-collection flow has
been significantly hardened this session (carry-over correction, server-side receipt generation,
double-submit guard, DB constraint cleanup).

**The single highest-leverage remaining action is SEC-01/SEC-02/SEC-05** (message IDOR,
owner write bypass, notifications IDOR) — these allow cross-school data access with existing
user accounts and no special privileges beyond role=ADMIN or role=APPLICATION_OWNER.

**Roadmap (updated)**

| Phase | Focus | Key items |
|-------|-------|-----------|
| 1 — Immediate | Security hot-fixes | SEC-01 through SEC-08, BUG-05, BUG-06 (audit logs) |
| 2 — Data integrity | Business logic bugs | BUG-01–BUG-12, PERF-04, BUG-09 |
| 3 — Performance | N+1 / indexes | PERF-01–PERF-05, H5, C1/H1 Flyway V9 migration |
| 4 — SMS hardening | Notification security | SMS-01–SMS-06 |
| 5 — Frontend quality | API contracts + React bugs | API-01–API-06, REACT-01–REACT-04 |
| 6 — Architecture | Deduplication | ARCH-01–ARCH-08, M2 (split AdminService) |
| 7 — Mobile + DevOps | Platform readiness | C2, H16–H19, M13–M18, Sentry |

This document supersedes v2. Update the status column as items are resolved.
