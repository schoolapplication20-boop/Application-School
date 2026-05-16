# End-to-End Test Cases & Scenarios — my-skoolz

**Document Version:** 1.0  
**Date:** 2026-05-15  
**Scope:** All application modules (Authentication, Admin, Teacher, Student, Parent, Super Admin, Marketing)  
**Environment:** Browser-based, performed against the running full stack (React + Spring Boot)

---

## How to Read This Document

Each test case follows this structure:

| Field | Description |
|-------|-------------|
| **ID** | Unique test identifier (e.g. `TC-AUTH-001`) |
| **Module** | The feature area being tested |
| **Preconditions** | State required before the test begins |
| **Steps** | Numbered actions to perform |
| **Expected Result** | What should happen if the feature works correctly |
| **Priority** | P1 (Critical) · P2 (High) · P3 (Medium) · P4 (Low) |

---

## Module 1 — Authentication

### TC-AUTH-001 — Successful Login as Admin
**Priority:** P1

**Preconditions:** App is running. An active ADMIN account (`admin@school.com` / `Admin@123`) exists.

**Steps:**
1. Navigate to `/login`.
2. Click the **Admin** role card.
3. Enter `admin@school.com` in the email field.
4. Enter `Admin@123` in the password field.
5. Click **LOGIN**.

**Expected Result:**
- Spinner appears briefly.
- User is redirected to `/admin/dashboard`.
- Sidebar shows Admin navigation links.
- Welcome message or school name is visible.

---

### TC-AUTH-002 — Login with Wrong Password
**Priority:** P1

**Preconditions:** App is running. Valid admin email is known.

**Steps:**
1. Navigate to `/login` → select **Admin**.
2. Enter a valid email and an incorrect password.
3. Click **LOGIN**.

**Expected Result:**
- No redirect occurs.
- An error message (e.g. "Incorrect password") is shown inline.
- The password field is cleared or remains for retry.

---

### TC-AUTH-003 — Login with Wrong Role
**Priority:** P1

**Preconditions:** User account exists with role TEACHER.

**Steps:**
1. Navigate to `/login` → select **Admin** role card.
2. Enter the TEACHER account's email and correct password.
3. Click **LOGIN**.

**Expected Result:**
- Login is rejected.
- Error message indicates "Access denied" or "incorrect role".
- User is NOT redirected to the dashboard.

---

### TC-AUTH-004 — Login with Empty Fields
**Priority:** P2

**Preconditions:** None.

**Steps:**
1. Navigate to `/login` → select **Admin**.
2. Click **LOGIN** without entering any credentials.

**Expected Result:**
- Inline validation messages appear: "Enter your email" and "Enter your password".
- No API call is made.

---

### TC-AUTH-005 — Forgot Password — Request OTP
**Priority:** P1

**Preconditions:** User has a registered mobile number.

**Steps:**
1. Navigate to `/login` → select any role → click **Forgot Password**.
2. Enter the registered mobile number.
3. Click **Send OTP**.

**Expected Result:**
- Success message: "OTP sent to your registered mobile".
- Redirect to OTP entry screen.

---

### TC-AUTH-006 — Forgot Password — Wrong / Expired OTP
**Priority:** P2

**Preconditions:** OTP has been sent to mobile.

**Steps:**
1. On the OTP entry screen, enter an incorrect 4-digit OTP.
2. Click **Verify**.

**Expected Result:**
- Error message: "Invalid OTP" or "OTP expired".
- User remains on the OTP screen and can retry.

---

### TC-AUTH-007 — Reset Password Successfully
**Priority:** P1

**Preconditions:** OTP has been verified; user is on the Reset Password screen.

**Steps:**
1. Enter a new password (e.g. `NewPass@2026`).
2. Confirm the new password.
3. Click **Reset Password**.

**Expected Result:**
- Success message: "Password reset successfully".
- Redirect to login screen.
- User can log in with the new password.

---

### TC-AUTH-008 — Logout
**Priority:** P1

**Preconditions:** User is logged in as any role.

**Steps:**
1. Click the **Logout** button in the sidebar or top bar.

**Expected Result:**
- Session is cleared (no token in storage).
- User is redirected to `/login`.
- Pressing the browser back button does NOT return to a protected page.

---

### TC-AUTH-009 — Session Persistence on Page Refresh
**Priority:** P2

**Preconditions:** User is logged in.

**Steps:**
1. Press F5 / Ctrl+R to hard-refresh the page.

**Expected Result:**
- User remains authenticated.
- Page re-renders at the same route without a redirect to `/login`.

---

### TC-AUTH-010 — Unauthenticated Direct URL Access
**Priority:** P1

**Preconditions:** User is NOT logged in.

**Steps:**
1. Type `/admin/dashboard` directly in the browser address bar.

**Expected Result:**
- User is redirected to `/login`.
- After successful login, user is redirected back to `/admin/dashboard`.

---

## Module 2 — Admin Dashboard

### TC-ADMIN-001 — View Dashboard Statistics
**Priority:** P1

**Preconditions:** Logged in as ADMIN. School has at least 5 students, 2 teachers.

**Steps:**
1. Navigate to `/admin/dashboard`.

**Expected Result:**
- Stat cards show correct counts: Total Students, Total Teachers, Total Classes, etc.
- Charts (attendance, fee collection) render without errors.

---

### TC-ADMIN-002 — Add a New Student
**Priority:** P1

**Preconditions:** Logged in as ADMIN. At least one class exists.

**Steps:**
1. Navigate to **Students** → click **Add Student**.
2. Fill in all required fields: Name, Date of Birth, Roll Number, Class, Section, Guardian Name, Mobile.
3. Click **Save**.

**Expected Result:**
- Success toast: "Student added successfully".
- New student appears in the Students list.
- Student is assigned a system-generated admission number.

---

### TC-ADMIN-003 — Search Students
**Priority:** P2

**Preconditions:** Logged in as ADMIN. Multiple students exist.

**Steps:**
1. Navigate to **Students**.
2. Type part of a student's name in the search box.

**Expected Result:**
- List filters in real time to show only matching students.
- Clearing the search restores the full list.

---

### TC-ADMIN-004 — Delete a Student
**Priority:** P2

**Preconditions:** Logged in as ADMIN. At least one student exists.

**Steps:**
1. Navigate to **Students**.
2. Click the Delete icon next to a student.
3. Confirm the deletion in the confirmation dialog.

**Expected Result:**
- Success toast: "Student deleted".
- Student is no longer visible in the list.

---

### TC-ADMIN-005 — Add a New Teacher
**Priority:** P1

**Preconditions:** Logged in as ADMIN.

**Steps:**
1. Navigate to **Teachers** → click **Add Teacher**.
2. Fill in Name, Email, Subject, Mobile, Qualification.
3. Click **Save**.

**Expected Result:**
- Success toast: "Teacher added successfully".
- Teacher appears in the list.
- System-generated credentials are displayed/sent.

---

### TC-ADMIN-006 — Manage Classes
**Priority:** P2

**Preconditions:** Logged in as ADMIN.

**Steps:**
1. Navigate to **Classes** → click **Add Class**.
2. Enter Class Name (e.g. "Grade 5") and Section (e.g. "A").
3. Click **Save**.

**Expected Result:**
- New class/section appears in the classes list.
- Class is available in student add/edit forms.

---

### TC-ADMIN-007 — View Attendance Report
**Priority:** P2

**Preconditions:** Logged in as ADMIN. Attendance data exists for at least one day.

**Steps:**
1. Navigate to **Attendance Report**.
2. Select a class and a date range.
3. Click **Generate**.

**Expected Result:**
- Report renders with student names, dates, and attendance status (Present/Absent/Late).
- Export to CSV/PDF is available.

---

### TC-ADMIN-008 — Collect Fee
**Priority:** P1

**Preconditions:** Logged in as ADMIN. A student with a pending fee exists.

**Steps:**
1. Navigate to **Collect Fee**.
2. Search for the student by name or admission number.
3. Select the fee type and amount.
4. Click **Collect**.

**Expected Result:**
- Success toast: "Fee collected".
- Student's fee status updates to "Paid" for that installment.
- A receipt is generated.

---

### TC-ADMIN-009 — Manage Salaries
**Priority:** P2

**Preconditions:** Logged in as ADMIN. Teachers exist.

**Steps:**
1. Navigate to **Salaries**.
2. Select a teacher and a month.
3. Enter the salary amount and click **Pay**.

**Expected Result:**
- Salary record is created.
- Teacher's salary history shows the payment.

---

### TC-ADMIN-010 — Manage School Settings
**Priority:** P2

**Preconditions:** Logged in as ADMIN.

**Steps:**
1. Navigate to **School Settings**.
2. Update the school name or logo.
3. Click **Save**.

**Expected Result:**
- Settings are persisted.
- School name/logo updates reflect across the app (header, login page).

---

### TC-ADMIN-011 — Role-Based Access: Teacher Cannot Access Admin Pages
**Priority:** P1

**Preconditions:** Logged in as TEACHER.

**Steps:**
1. Type `/admin/students` directly in the address bar.

**Expected Result:**
- User sees an "Access Denied" page or is redirected to `/teacher/dashboard`.
- No admin data is shown.

---

## Module 3 — Teacher Module

### TC-TEACHER-001 — Mark Attendance
**Priority:** P1

**Preconditions:** Logged in as TEACHER. Assigned to at least one class.

**Steps:**
1. Navigate to **Attendance**.
2. Select the class and date.
3. Mark each student as Present / Absent / Late.
4. Click **Submit**.

**Expected Result:**
- Success toast: "Attendance saved".
- Attendance report reflects the marks for that date.
- Cannot submit attendance twice for the same class/date.

---

### TC-TEACHER-002 — Assign Homework
**Priority:** P2

**Preconditions:** Logged in as TEACHER. At least one class assigned.

**Steps:**
1. Navigate to **Homework** → click **Add**.
2. Select class, subject, enter description, set due date.
3. Click **Save**.

**Expected Result:**
- Homework appears in the homework list.
- Students in that class can see it in their portal.

---

### TC-TEACHER-003 — Enter Exam Marks
**Priority:** P1

**Preconditions:** Logged in as TEACHER. Examination exists for their subject.

**Steps:**
1. Navigate to **Marks**.
2. Select the exam and class.
3. Enter marks for each student.
4. Click **Save**.

**Expected Result:**
- Marks are saved.
- Students can view their marks in the student portal.

---

### TC-TEACHER-004 — Apply for Leave
**Priority:** P2

**Preconditions:** Logged in as TEACHER.

**Steps:**
1. Navigate to **Leave Request** → click **Apply**.
2. Select leave type (Sick / Personal / etc.), start date, end date, reason.
3. Click **Submit**.

**Expected Result:**
- Leave request appears with status "Pending".
- Admin can see and approve/reject it.

---

### TC-TEACHER-005 — View Timetable
**Priority:** P3

**Preconditions:** Logged in as TEACHER. Timetable has been set by admin.

**Steps:**
1. Navigate to **Schedule** (timetable).

**Expected Result:**
- Weekly schedule is displayed showing periods, subjects, and rooms.

---

### TC-TEACHER-006 — Send Message to Student/Parent
**Priority:** P2

**Preconditions:** Logged in as TEACHER.

**Steps:**
1. Navigate to **Messages** → click **New Message**.
2. Select recipient (student or parent).
3. Type message and click **Send**.

**Expected Result:**
- Message appears in Sent folder.
- Recipient can see the message in their Messages page.

---

## Module 4 — Student Module

### TC-STUDENT-001 — View Dashboard
**Priority:** P1

**Preconditions:** Logged in as STUDENT.

**Steps:**
1. Navigate to `/student/dashboard`.

**Expected Result:**
- Dashboard shows upcoming exams, recent attendance, pending fees, announcements.

---

### TC-STUDENT-002 — View Attendance
**Priority:** P2

**Preconditions:** Logged in as STUDENT. Attendance has been marked for the current month.

**Steps:**
1. Navigate to **Attendance**.

**Expected Result:**
- Calendar or list shows present/absent/late for each school day.
- Attendance percentage is displayed.

---

### TC-STUDENT-003 — View Fee Status
**Priority:** P2

**Preconditions:** Logged in as STUDENT. Fee has been assigned.

**Steps:**
1. Navigate to **Fees**.

**Expected Result:**
- List of fees showing amount, due date, and status (Paid / Pending / Overdue).

---

### TC-STUDENT-004 — View Examination Schedule
**Priority:** P2

**Preconditions:** Logged in as STUDENT. Examinations are scheduled.

**Steps:**
1. Navigate to **Exams**.

**Expected Result:**
- Upcoming exams list with subject, date, time, and room.
- Past exams show marks if entered by the teacher.

---

### TC-STUDENT-005 — Submit Leave Request
**Priority:** P2

**Preconditions:** Logged in as STUDENT.

**Steps:**
1. Navigate to **Leave Request** → click **Apply**.
2. Enter dates and reason.
3. Click **Submit**.

**Expected Result:**
- Leave request is created with "Pending" status.
- Teacher/admin can view and approve/reject.

---

### TC-STUDENT-006 — View Class Diary
**Priority:** P3

**Preconditions:** Logged in as STUDENT. Teacher has posted diary entries.

**Steps:**
1. Navigate to **Diary**.

**Expected Result:**
- Diary entries listed by date with teacher remarks.

---

### TC-STUDENT-007 — View Messages
**Priority:** P3

**Preconditions:** Logged in as STUDENT. Teacher has sent a message.

**Steps:**
1. Navigate to **Messages**.

**Expected Result:**
- Message appears in inbox with sender name, subject, and date.

---

## Module 5 — Parent Module

### TC-PARENT-001 — View Child's Attendance
**Priority:** P1

**Preconditions:** Logged in as PARENT. Child's attendance has been marked.

**Steps:**
1. Navigate to **Attendance**.

**Expected Result:**
- Child's attendance record is shown.
- Absent days are highlighted.

---

### TC-PARENT-002 — Pay Fees Online
**Priority:** P1

**Preconditions:** Logged in as PARENT. Child has pending fees. Payment gateway is configured.

**Steps:**
1. Navigate to **Pay Fees**.
2. Select the fee installment.
3. Click **Pay Now**.
4. Complete payment in the gateway.

**Expected Result:**
- Payment confirmation screen appears.
- Fee status updates to "Paid".
- Receipt is generated.

---

### TC-PARENT-003 — View Performance / Marks
**Priority:** P2

**Preconditions:** Logged in as PARENT. Exam marks have been entered.

**Steps:**
1. Navigate to **Performance**.

**Expected Result:**
- Subject-wise marks are displayed for each exam.
- Overall rank or percentage is shown.

---

### TC-PARENT-004 — Submit Leave Request for Child
**Priority:** P2

**Preconditions:** Logged in as PARENT.

**Steps:**
1. Navigate to **Leave Request** → click **Apply**.
2. Enter dates and reason.
3. Click **Submit**.

**Expected Result:**
- Leave request created with "Pending" status.

---

### TC-PARENT-005 — View Homework / Assignments
**Priority:** P3

**Preconditions:** Logged in as PARENT. Teacher has assigned homework.

**Steps:**
1. Navigate to **Assignments**.

**Expected Result:**
- List of pending and completed homework for the child.

---

## Module 6 — Super Admin Module

### TC-SUPER-001 — Set Up a New School
**Priority:** P1

**Preconditions:** Logged in as SUPER_ADMIN.

**Steps:**
1. Navigate to **Setup School**.
2. Enter school name, address, board (CBSE/ICSE/State), and contact details.
3. Upload school logo.
4. Click **Save**.

**Expected Result:**
- School is created in the system.
- School ID is assigned.
- Admin accounts can now be created for this school.

---

### TC-SUPER-002 — Create an Admin Account
**Priority:** P1

**Preconditions:** Logged in as SUPER_ADMIN. A school exists.

**Steps:**
1. Navigate to **Admin Management** → click **Add Admin**.
2. Enter first name, last name, email, and mobile.
3. Click **Create**.

**Expected Result:**
- Admin account created.
- Login credentials are sent to the email.
- Admin appears in the admin list.

---

### TC-SUPER-003 — Manage Transport — Add a Bus Route
**Priority:** P2

**Preconditions:** Logged in as SUPER_ADMIN.

**Steps:**
1. Navigate to **Transport** → **Bus Management** → **Add Bus**.
2. Enter bus number, route name, driver name, and capacity.
3. Click **Save**.

**Expected Result:**
- Bus route appears in the transport list.
- Students can be assigned to the route.

---

### TC-SUPER-004 — Monitor Class Diary
**Priority:** P3

**Preconditions:** Logged in as SUPER_ADMIN. Teachers have posted diary entries.

**Steps:**
1. Navigate to **Diary Monitoring**.
2. Filter by class and date.

**Expected Result:**
- All diary entries across classes are visible.
- Can view entry details without editing them.

---

### TC-SUPER-005 — Manage Exam Schedule
**Priority:** P2

**Preconditions:** Logged in as SUPER_ADMIN.

**Steps:**
1. Navigate to **Exam Schedule** → click **Add Exam**.
2. Select class, subject, date, time, and room.
3. Click **Save**.

**Expected Result:**
- Exam appears in the schedule.
- Visible to teachers and students of that class.

---

## Module 7 — Marketing Pages

### TC-MKT-001 — Home Page Loads Correctly
**Priority:** P2

**Preconditions:** None (public page).

**Steps:**
1. Navigate to `/` (root).

**Expected Result:**
- Hero section with headline "Smart School Management" is visible.
- Navigation links: Home, Solutions, About, Contact, Book Demo.
- "Book a Free Demo" CTA button is present.
- Page is fully responsive at 375px, 768px, and 1440px widths.

---

### TC-MKT-002 — Book a Demo Form Submission
**Priority:** P2

**Preconditions:** None.

**Steps:**
1. Navigate to `/book-demo`.
2. Fill in School Name, Contact Name, Email, Mobile, and City.
3. Click **Book Demo**.

**Expected Result:**
- Success message: "Demo booked! Our team will contact you soon."
- Form resets.
- Entry appears in the admin/marketing backend.

---

### TC-MKT-003 — Contact Form Submission
**Priority:** P3

**Preconditions:** None.

**Steps:**
1. Navigate to `/contact`.
2. Fill in name, email, and message.
3. Click **Send Message**.

**Expected Result:**
- Success message confirms submission.
- Email is received by the configured inbox.

---

### TC-MKT-004 — Careers Page — View Job Listings
**Priority:** P4

**Preconditions:** None.

**Steps:**
1. Navigate to `/careers`.

**Expected Result:**
- Current job openings are displayed with title, location, and description.
- "Apply" button is present for each role.

---

### TC-MKT-005 — Solutions Page Loads Without Errors
**Priority:** P3

**Preconditions:** None.

**Steps:**
1. Navigate to `/solutions`.

**Expected Result:**
- Feature tiles are visible for each module (Students, Teachers, Attendance, etc.).
- No broken images or JS errors in the browser console.

---

## Module 8 — Admission Applications (Public)

### TC-APP-001 — Submit an Admission Application
**Priority:** P1

**Preconditions:** None (public endpoint).

**Steps:**
1. Navigate to the public admission form.
2. Fill in student name, class applying for, guardian name, and mobile number.
3. Click **Submit Application**.

**Expected Result:**
- Success confirmation with an application reference number.
- Application appears in the Admin → **Applications** list for review.

---

### TC-APP-002 — Admin Reviews Admission Application
**Priority:** P2

**Preconditions:** Logged in as ADMIN. At least one application exists.

**Steps:**
1. Navigate to **Applications**.
2. Click on a pending application.
3. Click **Approve** or **Reject**.

**Expected Result:**
- Application status updates to Approved/Rejected.
- Notification is sent to the applicant (if email is configured).

---

## Module 9 — PWA / Mobile Install

### TC-PWA-001 — PWA Install Prompt on Android
**Priority:** P3

**Preconditions:** App served over HTTPS. Chrome browser on Android. First visit (not already installed).

**Steps:**
1. Open the app in Chrome on Android.
2. Wait for the install banner to appear at the bottom.
3. Click **Add to Home Screen**.

**Expected Result:**
- Browser's install prompt appears.
- After confirmation, app icon is added to the home screen.
- App launches in standalone mode (no browser chrome).

---

### TC-PWA-002 — PWA Install Instructions on iOS
**Priority:** P3

**Preconditions:** App served over HTTPS. Safari on iOS.

**Steps:**
1. Open the app in Safari on iOS.
2. Wait for the custom install banner to appear.

**Expected Result:**
- Banner shows: "Tap Share → Add to Home Screen".
- Dismissing the banner persists for the session (does not reappear on same tab refresh).

---

### TC-PWA-003 — Offline Behavior
**Priority:** P4

**Preconditions:** App has been installed as PWA. User has visited previously.

**Steps:**
1. Turn off network connectivity.
2. Open the installed app.

**Expected Result:**
- App shell loads from service worker cache.
- Cached pages (login, dashboard skeleton) are visible.
- Network-dependent data shows a user-friendly "offline" message.

---

## Module 10 — AI Chat Assistant

### TC-AI-001 — Send a Message to AI Chat
**Priority:** P3

**Preconditions:** Logged in as any authenticated user. AI service is configured.

**Steps:**
1. Click the AI Chat button (usually a floating action button).
2. Type "What are the upcoming exams?".
3. Press **Send**.

**Expected Result:**
- Response appears within 5 seconds.
- Response is contextually relevant to the school data.

---

### TC-AI-002 — AI Chat Session Clears on Logout
**Priority:** P4

**Preconditions:** User has an active AI chat conversation.

**Steps:**
1. Logout.
2. Log back in.

**Expected Result:**
- Chat history is cleared.
- A fresh session starts.

---

## Regression Checklist

Run after any significant code change:

- [ ] Login works for all 4 roles (Super Admin, Admin, Teacher, Student)
- [ ] Password toggle shows/hides password
- [ ] Logout clears session and redirects to login
- [ ] Unauthenticated users cannot access protected routes
- [ ] Wrong-role users see "Access Denied"
- [ ] Student list paginates correctly
- [ ] Attendance submission prevents duplicate entries
- [ ] Fee collection generates a receipt
- [ ] Marketing home page loads in < 3 seconds
- [ ] PWA manifest loads without errors (check DevTools → Application)
