-- ==============================================
-- DATABASE OPTIMIZATION SCRIPT
-- ==============================================
-- Run these SQL commands to optimize database performance
-- Location: server/sql/01_add_production_indexes.sql
--
-- INSTRUCTIONS:
-- 1. Connect to PostgreSQL: psql -U postgres -d schoolers
-- 2. Run: \i /path/to/this/file.sql
-- 3. Verify: SELECT * FROM pg_indexes WHERE tablename IN ('student', 'attendance', 'fee_payment');

-- ==============================================
-- CRITICAL INDEXES (Must have for production)
-- ==============================================

-- 1. STUDENT QUERIES (most frequently used)
CREATE INDEX IF NOT EXISTS idx_student_school_id ON student(school_id);
CREATE INDEX IF NOT EXISTS idx_student_admission_number ON student(admission_number);
CREATE INDEX IF NOT EXISTS idx_student_school_admission ON student(school_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_student_email ON student(email);
CREATE INDEX IF NOT EXISTS idx_student_classroom ON student(class_room_id);

-- 2. ATTENDANCE TRACKING (second most used)
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_room_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- 3. FEE MANAGEMENT
CREATE INDEX IF NOT EXISTS idx_fee_student_id ON fee(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_status ON fee(status);
CREATE INDEX IF NOT EXISTS idx_fee_payment_date ON fee_payment(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payment_student ON fee_payment(student_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payment_status ON fee_payment(status);

-- 4. MARKS & EXAMINATION
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_exam ON marks(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedule_class ON exam_schedule(class_room_id);

-- 5. MESSAGING
CREATE INDEX IF NOT EXISTS idx_message_recipient_id ON message(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_sender_id ON message(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON message(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_status ON message(status);

-- 6. TEACHER ATTENDANCE
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date ON teacher_attendance(teacher_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_status ON teacher_attendance(status);

-- 7. GENERAL LOOKUPS (required for authentication, relationships)
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_school_id ON "user"(school_id);
CREATE INDEX IF NOT EXISTS idx_classroom_school_id ON class_room(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_school_id ON teacher(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_profile_school ON parent_profile(school_id);

-- 8. LEAVE REQUESTS
CREATE INDEX IF NOT EXISTS idx_leave_request_user_id ON leave_request(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_request_status ON leave_request(status);
CREATE INDEX IF NOT EXISTS idx_leave_request_created_date ON leave_request(created_at DESC);

-- 9. HOMEWORK & ASSIGNMENTS
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON homework(class_room_id);
CREATE INDEX IF NOT EXISTS idx_assignment_student_id ON assignment(student_id);

-- 10. CLASS DIARY
CREATE INDEX IF NOT EXISTS idx_class_diary_class_id ON class_diary(class_room_id);
CREATE INDEX IF NOT EXISTS idx_class_diary_created_date ON class_diary(created_at DESC);

-- 11. TRANSPORT
CREATE INDEX IF NOT EXISTS idx_transport_student_assignment_student ON transport_student_assignment(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_bus_route ON transport_bus(route_id);

-- 12. ANNOUNCEMENTS
CREATE INDEX IF NOT EXISTS idx_announcement_school_id ON announcement(school_id);
CREATE INDEX IF NOT EXISTS idx_announcement_created_date ON announcement(created_at DESC);

-- ==============================================
-- ANALYZE INDEXES (generate statistics)
-- ==============================================
ANALYZE;

-- ==============================================
-- VERIFY INDEXES WERE CREATED
-- ==============================================
-- Run this query to verify all indexes exist:
-- SELECT indexname FROM pg_indexes WHERE tablename IN (
--   'student', 'attendance', 'fee', 'fee_payment', 'marks', 
--   'message', 'teacher_attendance', 'user', 'class_room', 
--   'teacher', 'leave_request', 'homework', 'assignment', 
--   'class_diary', 'transport_student_assignment', 'announcement'
-- ) ORDER BY tablename, indexname;

-- ==============================================
-- PERFORMANCE MONITORING (Run periodically)
-- ==============================================

-- 1. Find missing indexes (run monthly)
-- SELECT schemaname, tablename, attname 
-- FROM pg_stats 
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- AND null_frac > 0.05 
-- AND n_distinct > 1000;

-- 2. Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- 3. Check slow queries (requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- SELECT query, calls, mean_exec_time, max_exec_time 
-- FROM pg_stat_statements 
-- WHERE mean_exec_time > 100 
-- ORDER BY mean_exec_time DESC LIMIT 20;

-- ==============================================
-- OPTIONAL: PARTITION LARGE TABLES
-- ==============================================
-- For tables with 1M+ rows, consider partitioning by date
-- Uncomment and run when attendance table exceeds 1M rows

-- ALTER TABLE attendance 
-- PARTITION BY RANGE (YEAR(attendance_date)) (
--   PARTITION p2023 VALUES LESS THAN (2024),
--   PARTITION p2024 VALUES LESS THAN (2025),
--   PARTITION p2025 VALUES LESS THAN (2026),
--   PARTITION p2026 VALUES LESS THAN (2027),
--   PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- ==============================================
-- CLEANUP & MAINTENANCE (Run monthly)
-- ==============================================

-- VACUUM ANALYZE;  -- Reclaim space and update statistics
-- REINDEX DATABASE schoolers;  -- Rebuild all indexes (can take time)

