-- =====================================================================
-- PLATFORM RESET — removes ALL school data and all users except
-- the APPLICATION_OWNER: navaneeswar1861@gmail.com
--
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (IF EXISTS guards on schools/users).
-- =====================================================================

BEGIN;

-- ── 1. Security / session housekeeping ──────────────────────────────
TRUNCATE TABLE revoked_tokens        RESTART IDENTITY CASCADE;
TRUNCATE TABLE idempotency_keys      RESTART IDENTITY CASCADE;
TRUNCATE TABLE email_verifications   RESTART IDENTITY CASCADE;

-- ── 2. AI chatbot ────────────────────────────────────────────────────
TRUNCATE TABLE chat_messages         RESTART IDENTITY CASCADE;
TRUNCATE TABLE chat_sessions         RESTART IDENTITY CASCADE;

-- ── 3. Notifications & audit ─────────────────────────────────────────
TRUNCATE TABLE notifications         RESTART IDENTITY CASCADE;
TRUNCATE TABLE audit_logs            RESTART IDENTITY CASCADE;

-- ── 4. Messaging ─────────────────────────────────────────────────────
TRUNCATE TABLE messages              RESTART IDENTITY CASCADE;
TRUNCATE TABLE announcements         RESTART IDENTITY CASCADE;

-- ── 5. Assignments & submissions ──────────────────────────────────────
TRUNCATE TABLE assignment_submissions RESTART IDENTITY CASCADE;
TRUNCATE TABLE assignments            RESTART IDENTITY CASCADE;

-- ── 6. Attendance ────────────────────────────────────────────────────
TRUNCATE TABLE attendance            RESTART IDENTITY CASCADE;
TRUNCATE TABLE teacher_attendance    RESTART IDENTITY CASCADE;

-- ── 7. Academic records ──────────────────────────────────────────────
TRUNCATE TABLE marks                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE hall_tickets          RESTART IDENTITY CASCADE;
TRUNCATE TABLE certificates          RESTART IDENTITY CASCADE;
TRUNCATE TABLE exam_schedules        RESTART IDENTITY CASCADE;
TRUNCATE TABLE exam_types            RESTART IDENTITY CASCADE;
TRUNCATE TABLE grade_scales          RESTART IDENTITY CASCADE;
TRUNCATE TABLE timetable             RESTART IDENTITY CASCADE;

-- ── 8. Class diary, events, holidays ─────────────────────────────────
TRUNCATE TABLE class_diary           RESTART IDENTITY CASCADE;
TRUNCATE TABLE school_events         RESTART IDENTITY CASCADE;
TRUNCATE TABLE holidays              RESTART IDENTITY CASCADE;

-- ── 9. Leave management ──────────────────────────────────────────────
TRUNCATE TABLE leave_requests        RESTART IDENTITY CASCADE;

-- ── 10. Meetings & appointments ──────────────────────────────────────
TRUNCATE TABLE meeting_bookings            RESTART IDENTITY CASCADE;
TRUNCATE TABLE meeting_slots               RESTART IDENTITY CASCADE;
TRUNCATE TABLE parent_teacher_appointments RESTART IDENTITY CASCADE;

-- ── 11. Admissions ───────────────────────────────────────────────────
TRUNCATE TABLE admission_applications RESTART IDENTITY CASCADE;

-- ── 12. Fees ─────────────────────────────────────────────────────────
TRUNCATE TABLE fee_installments        RESTART IDENTITY CASCADE;
TRUNCATE TABLE fee_payments            RESTART IDENTITY CASCADE;
TRUNCATE TABLE student_fee_assignments RESTART IDENTITY CASCADE;
TRUNCATE TABLE class_fee_structure     RESTART IDENTITY CASCADE;
TRUNCATE TABLE fees                    RESTART IDENTITY CASCADE;

-- ── 13. Salary & expenses ────────────────────────────────────────────
TRUNCATE TABLE salary_payments       RESTART IDENTITY CASCADE;
TRUNCATE TABLE salaries              RESTART IDENTITY CASCADE;
TRUNCATE TABLE expenses              RESTART IDENTITY CASCADE;

-- ── 14. Transport ────────────────────────────────────────────────────
TRUNCATE TABLE transport_student_assignments RESTART IDENTITY CASCADE;
TRUNCATE TABLE student_transport             RESTART IDENTITY CASCADE;
TRUNCATE TABLE transport_fees                RESTART IDENTITY CASCADE;
TRUNCATE TABLE transport_stops               RESTART IDENTITY CASCADE;
TRUNCATE TABLE transport_routes              RESTART IDENTITY CASCADE;
TRUNCATE TABLE transport_drivers             RESTART IDENTITY CASCADE;
TRUNCATE TABLE transport_buses               RESTART IDENTITY CASCADE;

-- ── 15. Teacher class assignments ────────────────────────────────────
TRUNCATE TABLE teacher_class_assignments RESTART IDENTITY CASCADE;

-- ── 16. Import logs ──────────────────────────────────────────────────
TRUNCATE TABLE import_logs           RESTART IDENTITY CASCADE;

-- ── 17. People: students, teachers, classrooms, parents ──────────────
TRUNCATE TABLE students              RESTART IDENTITY CASCADE;
TRUNCATE TABLE teachers              RESTART IDENTITY CASCADE;
TRUNCATE TABLE classrooms            RESTART IDENTITY CASCADE;
TRUNCATE TABLE parent_profiles       RESTART IDENTITY CASCADE;

-- ── 18. Schools ──────────────────────────────────────────────────────
TRUNCATE TABLE schools               RESTART IDENTITY CASCADE;

-- ── 19. Users: keep APPLICATION_OWNER only ───────────────────────────
DELETE FROM users
WHERE LOWER(email) != LOWER('navaneeswar1861@gmail.com');

COMMIT;

-- ── Verification ─────────────────────────────────────────────────────
SELECT 'users remaining'  AS check, COUNT(*) AS count FROM users
UNION ALL
SELECT 'schools remaining', COUNT(*) FROM schools
UNION ALL
SELECT 'students remaining', COUNT(*) FROM students
UNION ALL
SELECT 'teachers remaining', COUNT(*) FROM teachers;
