# Schoolers — User Manual

**Version:** 1.0  
**Last Updated:** May 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Roles Overview](#2-roles-overview)
3. [Application Owner](#3-application-owner)
4. [Super Admin](#4-super-admin)
5. [Admin](#5-admin)
6. [Teacher](#6-teacher)
7. [Student](#7-student)
8. [Key Workflows](#8-key-workflows)
9. [Common Features](#9-common-features)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### Accessing the Application

Open the application in your web browser. You can also install it as an app on your phone or desktop — look for the **"Add to Home Screen"** prompt that appears automatically.

### Logging In

1. On the login page, select your **role** from the dropdown (Super Admin, Admin, Teacher, or Student).
2. Enter your **email address** (or admission number for students) and **password**.
3. Click **Login**.

> **Students** log in using their admission number and assigned password.

### First Login — Setting Your Password

If you are logging in for the first time with a temporary password, you will be redirected to a **Set Password** page before you can access the system.

- Password must be at least **8 characters** long.
- Must include at least one **uppercase letter**, one **lowercase letter**, one **number**, and one **special character** (e.g., `@`, `#`, `!`).

### Forgot Your Password

1. Click **Forgot Password** on the login page.
2. Enter your registered **email address**.
3. A **6-digit OTP** will be sent to your email. It expires in **5 minutes**.
4. Enter the OTP on the next screen. Click **Resend OTP** if needed.
5. Set your new password and confirm it.
6. You will be redirected to the login page.

### Changing Your Password

Once logged in, you can change your password at any time:

1. Go to your **profile** or account settings.
2. Enter your **current password**.
3. Enter and confirm your **new password**.
4. Click **Save**.

---

## 2. Roles Overview

| Role | Description |
|------|-------------|
| **Application Owner** | Platform-level administrator. Manages all schools, super admins, and platform-wide settings. |
| **Super Admin** | School owner. Has full access to all features within their school. Sets up the school and creates Admin accounts. |
| **Admin** | School-level manager with module-specific permissions. Handles day-to-day operations like students, fees, attendance, and salaries. |
| **Teacher** | Marks attendance, uploads marks, manages homework/diary, and views their timetable. |
| **Student** | Views their own attendance, fees, exam schedule, results, and diary entries. |

---

## 3. Application Owner

The Application Owner has platform-wide access and manages all schools registered on the system.

### 3.1 Application Owner Dashboard

After login you land on the **Owner Dashboard**, which shows:

- A list of all registered **Super Admins / Schools** with search functionality.
- Expandable rows showing school details: name, contact, admin details, subscription status.
- **Demo Booking Requests** submitted from the public marketing website.
- Platform-wide announcements and system notices.

**Actions available per school:**
- View all users in a school
- Edit school or admin details
- Delete an admin or an entire school (requires confirmation)

### 3.2 Setting Up a New School

1. Click **Add New School** (or use the **Setup Wizard**).
2. Complete the multi-step wizard:

| Step | Fields |
|------|--------|
| **Basic Info** | School ID, name, school code, board (e.g., CBSE), academic year |
| **Address** | Street address, city, state, pincode, country |
| **Contact** | Phone, email, website |
| **Branding** | Primary color, secondary color (used throughout the school's UI) |
| **Academic** | Total number of classes, section format (e.g., A, B, C, D) |
| **Admin Account** | Admin name, email, mobile number |
| **Subscription** | Plan type, subscription expiry date |
| **Features** | Enable or disable modules: Attendance, Transport, Fees, Salary, Exams, Diary, Announcements, Messages |

3. Click **Finish Setup**. The school is now live and the admin will receive login credentials.

### 3.3 Managing Super Admins

- Navigate to the **Admin Management** section.
- You can **add**, **edit**, or **delete** Super Admin accounts.
- Reset passwords and view credentials from this page.

---

## 4. Super Admin

The Super Admin has full access to all features within their school.

### 4.1 Super Admin Dashboard

Your dashboard shows a real-time snapshot of your school:

- **Stats:** Total students, teachers, revenue, expenses, and attendance percentage.
- **Recent Applications:** Pending / approved / rejected admission counts.
- **Recent Fee Payments:** Latest payment transactions.
- **Revenue vs. Expenses Chart:** Monthly bar chart.
- **Attendance Trend Chart:** Monthly attendance line chart.

> The dashboard refreshes automatically every 60 seconds.

### 4.2 Admin Management

Create and manage Admin accounts for your school.

**To create a new Admin:**

1. Go to **Admin Management**.
2. Click **Add Admin**.
3. Fill in: Name, email, mobile number.
4. Select the **permissions** to grant this admin:

| Permission | What it Controls |
|-----------|-----------------|
| Students | View/manage student records |
| Teachers | View/manage teacher records |
| Classes | View/manage classrooms |
| Applications | View/approve admission applications |
| Fees | Manage fee structures and assignments |
| Collect Fee | Access the fee collection counter |
| Salaries | Manage teacher salaries |
| Expenses | Record and view school expenses |
| Leave Management | Approve/reject leave requests |
| Transport | Manage transport routes and assignments |
| Attendance | View attendance reports |
| Timetable | Create and edit timetables |
| Exam & Certificates | Manage exams and generate certificates |

5. Click **Save**. A temporary password is generated — note it down to share with the admin.

**Other actions:**
- **Reset Password:** Generates a new temporary password for the admin.
- **Edit:** Update admin details or permissions.
- **Delete:** Permanently removes the admin account.

### 4.3 Transport Management

Manage the school's transportation system from the **Transport** section.

#### Buses

1. Go to **Transport > Buses**.
2. Click **Add Bus**.
3. Enter: Registration number, model, year, seating capacity, and assign a driver.

#### Drivers

1. Go to **Transport > Drivers**.
2. Click **Add Driver**.
3. Enter: Name, mobile number, license number, and status (Active/Inactive).

#### Routes

1. Go to **Transport > Routes**.
2. Click **Add Route**.
3. Enter a route name and mark its status.

#### Stops

1. Go to **Transport > Stops**.
2. Add stops along a route with stop names.

#### Enrolling Students in Transport

1. Go to **Transport > Students**.
2. Search for a student and click **Assign**.
3. Select: Route, stop, pickup location, drop location, and transport fee.
4. Click **Save**.

#### Transport Fees

Go to **Transport > Fees** to view each student's transport fee payment status (Paid / Pending / Overdue).

### 4.4 Exam Schedule

1. Go to **Exam Schedule**.
2. Click **Add Exam**.
3. Select the class, exam type (Annual, Half Yearly, Mid Term, Unit Test, Quarterly).
4. Add subjects with:
   - Subject name
   - Date, start time, end time
   - Hall/room number
   - Maximum marks
5. Click **Save**.

You can **edit** or **delete** exam entries and filter them by class or status.

### 4.5 School Settings

Update your school's information at any time:

1. Go to **School Settings**.
2. Update school name, contact, address, academic year, and board.
3. Upload a **school logo** (shown on all pages and receipts).
4. Set **primary and secondary brand colors**.
5. Enable or disable features for your school.
6. Click **Save**.

---

## 5. Admin

Admins handle day-to-day school operations. Your access depends on the permissions granted by your Super Admin.

### 5.1 Admin Dashboard

Shows the same key stats as the Super Admin dashboard. The dashboard auto-refreshes every 60 seconds.

### 5.2 Student Management

#### Adding a New Student

1. Go to **Students**.
2. Click **Add Student**.
3. Fill in the required details:
   - Personal: Full name, date of birth, blood group, gender, photo
   - Academic: Class, section, roll number
   - Family: Father's name & phone, mother's name & phone, guardian details
   - Address: Permanent address and alternate address
   - Documents: ID proof, transfer certificate, bonafide certificate
4. Click **Save**. The system generates an **admission number** and **temporary password** automatically.

#### Editing or Deleting a Student

- Use the **Edit** icon next to a student to update their details.
- Use the **Delete** icon and confirm the deletion.

#### Bulk Import

1. Click **Import Students**.
2. Download the CSV template.
3. Fill in student data following the template format.
4. Upload the completed CSV file.
5. Review the import summary — any failed rows are flagged with the reason.

#### Exporting Students

Click **Export** to download the student list as a CSV file.

### 5.3 Teacher Management

#### Adding a New Teacher

1. Go to **Teachers**.
2. Click **Add Teacher**.
3. Fill in:
   - Name, employee ID, email, mobile
   - Subject, department, qualification
   - Years of experience, joining date
   - Assigned classes (multi-select)
   - Teacher type: Subject Teacher / Class Teacher / Both
   - If Class Teacher: select the primary class
4. Click **Save**. A temporary password is generated.

**Resetting a Teacher's Password:**

1. Find the teacher in the list.
2. Click **Reset Password**.
3. A new temporary password is generated — share it with the teacher.

### 5.4 Class Management

1. Go to **Classes**.
2. Click **Add Class**.
3. Enter: Class name, section, assigned class teacher, and student capacity.
4. Click **Save**.

To **view students in a class**, click on the class row to expand it.

### 5.5 Fee Management

#### Setting Up a Fee Structure

1. Go to **Fees > Fee Structure**.
2. Select a class.
3. Enter fee amounts for each applicable type: Tuition, Transport, Lab, Exam, Sports, Other.
4. Create an **installment schedule**: Add terms (e.g., Term 1, Term 2, Term 3) with amounts and due dates.
5. Click **Save**.

#### Assigning Fees to a Student

1. Go to **Fees > Fee Assignment**.
2. Search for a student by name or admission number.
3. Review the assigned fee structure pulled from their class.
4. Adjust if needed and set the overall due date.
5. Click **Assign**.

#### Collecting Fee Payments

1. Go to **Collect Fee**.
2. Search for the student by name or admission number.
3. Their fee summary and installment schedule appear.
4. Select the installment(s) being paid.
5. Enter:
   - Payment amount
   - Payment date (defaults to today)
   - Receipt number (auto-generated, editable)
   - Remarks (optional)
6. Click **Record Payment**.
7. A **fee receipt** is generated — click **Print** to print it.

### 5.6 Attendance

#### Viewing Attendance Reports

1. Go to **Attendance**.
2. Select a class, date range, and optionally filter by status.
3. The report shows each student with their present/absent/leave count and percentage.
4. Click **Export** to download as CSV.

> **Marking attendance** is done by teachers. See [Teacher > Attendance](#61-marking-attendance).

### 5.7 Leave Management

1. Go to **Leave Management**.
2. Use the **Teacher Leaves** or **Student Leaves** tabs.
3. Filter by status: Pending, Approved, Rejected.
4. Click **Approve** or **Reject** on a request.
5. Add optional remarks before confirming.

### 5.8 Timetable

#### Creating a Timetable Entry

1. Go to **Timetable**.
2. Click **Add Entry**.
3. Select: Teacher, class, section, subject, day(s), start time, end time.
4. Click **Save**. The system checks for scheduling conflicts automatically.

> If a teacher is already assigned to another class at the same time, a conflict warning appears.

### 5.9 Admissions (Applications)

1. Go to **Applications**.
2. Use the tabs to filter: All, Pending, Approved, Rejected.
3. Click on an application to view full details and uploaded documents.
4. Click **Approve** or **Reject**.

**To add a manual application:**

1. Click **Add Application**.
2. Fill in the student and parent details.
3. Upload any available documents.
4. Click **Submit**.

### 5.10 Salary Management

#### Viewing Salaries

1. Go to **Salaries**.
2. Filter by month/year or teacher name.
3. Click on a record to view or edit salary components (basic pay, allowances, deductions).

#### Recording Leave Deductions

1. Open a salary record.
2. Enter the number of leaves taken.
3. The system calculates the deduction automatically.
4. Click **Save**.

#### Recording a Salary Payment

1. Click **Record Payment** on a salary record.
2. Select payment mode: Cash / Bank Transfer / Cheque.
3. Enter the payment date and any remarks.
4. Click **Confirm**. A receipt number is generated.

#### Managing Holidays

1. Go to **Salaries > Holidays**.
2. Click **Add Holiday**.
3. Enter: Holiday name, date, and whether it repeats yearly.
4. Holidays are automatically excluded from salary deduction calculations.

### 5.11 Expenses

1. Go to **Expenses**.
2. Click **Add Expense**.
3. Enter: Date, category, amount, description, and optionally upload an invoice.
4. Click **Save**.

Filter and view expense summaries by date range or category.

### 5.12 Parent Management

1. Go to **Parents**.
2. Click **Add Parent**.
3. Enter: Name, email, mobile, relation (Father/Mother/Guardian), occupation, address.
4. Click **Save**. Temporary credentials are generated.

---

## 6. Teacher

### 6.1 Marking Attendance

1. Go to **Attendance > Mark Attendance**.
2. Select the **class** and **date**.
3. For each student, click the appropriate status:
   - **P** — Present
   - **A** — Absent
   - **L** — Leave
   - **O** — Other
4. Click **Save Attendance**.

> If attendance has already been marked for the selected date, the saved records are pre-filled. You can update them before saving again.

To **export attendance**, click the **Export CSV** button after loading a class and date.

### 6.2 Uploading Marks

1. Go to **Marks > Upload Marks**.
2. Select: Class, exam type, date, and maximum marks.
3. Select the subjects to enter marks for.
4. A grid appears with students as rows and subjects as columns.
5. Enter marks for each student.
6. Click **Save All Marks**.

> Invalid entries (e.g., marks exceeding the maximum) are highlighted before saving.

### 6.3 Class Diary / Homework

#### Creating a Diary Entry

1. Go to **Diary / Homework**.
2. Click **New Entry**.
3. Fill in:
   - Class (auto-filled if you are a class teacher)
   - Subject(s)
   - Date
   - Topic covered
   - Homework description
   - Remarks (optional)
   - Optional image attachment
4. Click **Submit**.

#### Viewing Past Entries

- Use the date range and class filters to search past diary entries.
- Click on an entry to expand it and view details.

### 6.4 Timetable

Go to **Schedule** to view your personal timetable. Entries are grouped by day and color-coded by subject.

### 6.5 My Students

1. Go to **My Students**.
2. Select your assigned class.
3. View all students with their name, roll number, and status.
4. **Reset a student's password:**
   - Click **Reset Password** next to a student.
   - The default password is pre-filled (e.g., `rollNumber@123`).
   - Edit if needed and click **Confirm**.

### 6.6 Leave Approval (Class Teachers Only)

If you are a class teacher, you can approve or reject leave requests from your students:

1. Go to **Leave Approval**.
2. Review pending requests with reason and dates.
3. Click **Approve** or **Reject**.
4. Add optional remarks.

### 6.7 Teacher's Own Attendance

Go to **My Attendance** to view your personal attendance record by month, including:
- Days marked present, absent, and on leave
- Monthly attendance percentage

### 6.8 Submitting a Leave Request (as Teacher)

1. Go to **Leave Request**.
2. Select leave type (Sick / Personal / Other).
3. Enter from and to dates and a reason.
4. Click **Submit**.

Your request is visible to the Admin for approval.

---

## 7. Student

### 7.1 Student Dashboard

After logging in, you see:

- **Profile card** with your name, admission number, class, and photo.
- **Attendance Overview:** Your overall attendance percentage, present days, and total working days.
- **Fee Overview:** Total fee, amount paid, balance due, and next installment date.
- **Academic Performance:** Overall grade and recent exam marks.
- **Recent Attendance Trend:** A chart of your attendance over the past 3 months.

### 7.2 Viewing Attendance

Go to **Attendance**:

- **Overview tab:** Your overall percentage with a monthly breakdown chart.
- **Monthly Details tab:** Select a month to view day-by-day attendance:
  - Green = Present
  - Red = Absent
  - Orange = Leave
  - Gray = Holiday

### 7.3 Viewing Fees

Go to **Fees**:

- **Installment Schedule tab:** Shows each installment with amount, due date, paid date, and status (Paid / Partial / Pending / Overdue). Overdue items are highlighted.
- **Fee Breakdown tab:** Shows fee amounts by type (Tuition, Transport, Lab, Exam, Sports, Other).

### 7.4 Exam Schedule and Results

Go to **Exams**:

- **Timetable tab:** View upcoming exams with subject, date, time (12-hour format), and hall number.
- **Exam History tab:** View past exams. If results have been declared, your marks and grade are shown here.

Filter by exam type (Mid Term, Final, etc.) or search by subject.

### 7.5 Class Diary

Go to **Diary** to view entries posted by your teachers:

- Topics covered each day
- Homework assigned
- Any remarks
- Attached images (if any)

Entries are organized by date and subject.

### 7.6 Submitting a Leave Request

1. Go to **Leave Request**.
2. Click **New Request**.
3. Select leave type: Sick Leave / Family Emergency / Festival / Personal / Other.
4. Set the from and to dates.
5. Enter the reason.
6. Click **Submit**.

**Viewing your leave history:**

Go to the **Leave History** tab to see all submitted requests with their status (Pending / Approved / Rejected) and any remarks from your teacher or admin.

### 7.7 Messages and Announcements

Go to **Messages** to view:

- Messages sent to you by teachers or admins.
- School-wide announcements.
- Notification timestamps and read/unread status.

---

## 8. Key Workflows

### Student Onboarding

```
1. Admin adds student record (Students page)
2. System generates admission number and temporary password
3. Admin shares credentials with student/parent
4. Student logs in and sets a permanent password
5. Admin assigns fees to the student (Fees > Assignment)
6. Student can now access all their data
```

### Fee Collection Process

```
1. Admin sets class fee structure (Fees > Fee Structure)
2. Admin assigns fees to each student (Fees > Fee Assignment)
3. Student checks their fee balance (Student > Fees)
4. Student comes to the admin counter for payment
5. Admin uses Collect Fee page to record the payment
6. System generates and prints a receipt
7. Payment appears in the student's fee history
```

### Daily Attendance Workflow

```
1. Teacher opens Attendance > Mark Attendance
2. Selects class and today's date
3. Marks each student Present / Absent / Leave
4. Saves attendance
5. Admin can view reports (Attendance page)
6. Student can view their own record (Student > Attendance)
```

### Exam Management Workflow

```
1. Admin/Super Admin creates exam schedule (Exam Schedule page)
2. Students view the timetable (Student > Exams > Timetable)
3. Exams are conducted on scheduled dates
4. Teachers upload marks (Teacher > Marks > Upload)
5. Students view results (Student > Exams > History)
6. Admin can generate hall tickets and certificates
```

### Leave Workflow

```
Student/Teacher submits leave request
         ↓
Class Teacher (for student) or Admin (for teacher) reviews request
         ↓
Approves or Rejects with remarks
         ↓
Attendance marked as "Leave" for the approved dates
         ↓
Teacher leaves affect salary deductions
```

### Teacher Salary Workflow

```
1. Admin opens Salaries and selects the month
2. Reviews salary components and any leave deductions
3. Adjusts for holidays (auto-excluded if holidays are set)
4. Generates salary slip (downloadable PDF)
5. Records payment with mode and date
6. System assigns a receipt number
```

---

## 9. Common Features

These features work the same way across all pages:

### Search and Filter

Every main list page has a **search bar** and **filter dropdowns**. Start typing a name or select a filter value — the table updates immediately.

### Status Badges

Color-coded labels show the status of records at a glance:

| Color | Meaning |
|-------|---------|
| Green | Active / Present / Paid / Approved |
| Yellow / Orange | Pending / Partial |
| Red | Inactive / Absent / Overdue / Rejected |

### Toast Notifications

After saving or performing an action, a brief notification appears in the bottom-right corner confirming success or reporting an error.

### Confirmation Dialogs

All **delete** actions require you to confirm before the item is permanently removed.

### Pagination

Large tables are split across multiple pages (usually 8–10 items per page). Use the **Next / Previous** buttons or click a page number to navigate.

### Export to CSV

Where available, click the **Export** button to download the current table as a CSV file. You can open it in Excel or Google Sheets.

### Responsive Design

The application works on desktop, tablet, and mobile. On smaller screens, the sidebar collapses into a menu icon at the top.

---

## 10. Troubleshooting

### I can't log in

- Check that you selected the correct **role** from the dropdown.
- Students use their **admission number**, not email.
- If you forgot your password, click **Forgot Password**.
- If you have never logged in before, you need your **temporary password** from the admin.

### My temporary password is not working

- Temporary passwords are case-sensitive. Type it carefully.
- Ask your admin to **reset your password** — they will generate a new temporary password.

### A page shows "Access Denied" or is missing

- You may not have the required **permission** for that module.
- Contact your Super Admin to update your admin permissions.

### Attendance was already marked but I need to correct it

- Open **Attendance > Mark Attendance**, select the class and the same date.
- The previously saved attendance will be pre-loaded.
- Update the entries and click **Save Attendance** again to overwrite.

### A fee payment was recorded incorrectly

- Contact your Super Admin or Admin with the receipt number.
- An authorized admin can review and correct the payment record from the backend.

### The application is slow or not loading

- Check your internet connection.
- Try refreshing the page.
- Clear your browser cache and try again.
- If you installed the PWA, make sure your device is connected to the internet.

### My data looks outdated

- The dashboard refreshes every 60 seconds automatically.
- For other pages, click the browser **Refresh** button or navigate away and back.

---

*For technical support or to report a bug, contact your system administrator.*
