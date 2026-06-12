-- Performance indexes for multi-tenant queries.
--
-- Most queries filter by school_id (tenant scoping) and many also join on
-- foreign keys such as student_id / teacher_id / class_id / assignment_id.
-- Without indexes on these columns, Postgres falls back to sequential scans
-- as table sizes grow. All statements are idempotent (IF NOT EXISTS) so this
-- migration is safe to re-run.

-- ── school_id indexes (tenant scoping) ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_announcements_school_id            ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_school_id   ON admission_applications(school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id              ON assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_certificates_school_id             ON certificates(school_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_id   ON assignment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_class_diary_school_id              ON class_diary(school_id);
CREATE INDEX IF NOT EXISTS idx_class_fee_structure_school_id      ON class_fee_structure(school_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school_id               ON classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_id           ON exam_schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_school_id                     ON fees(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_school_id                 ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_grade_scales_school_id             ON grade_scales(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_types_school_id               ON exam_types(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_school_id         ON fee_installments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school_id             ON fee_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_hall_tickets_school_id             ON hall_tickets(school_id);
CREATE INDEX IF NOT EXISTS idx_holidays_school_id                 ON holidays(school_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_school_id           ON leave_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_school_id              ON import_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_school_id         ON meeting_bookings(school_id);
CREATE INDEX IF NOT EXISTS idx_meeting_slots_school_id            ON meeting_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_online_exam_attempts_school_id     ON online_exam_attempts(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_teacher_appts_school_id     ON parent_teacher_appointments(school_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_school_id        ON platform_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_salaries_school_id                 ON salaries(school_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_school_id          ON salary_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_school_id        ON student_transport(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_school_id  ON student_fee_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id                 ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_school_events_school_id            ON school_events(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_school_id                ON timetable(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_buses_school_id          ON transport_buses(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_school_id       ON teacher_attendance(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_drivers_school_id        ON transport_drivers(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_fees_school_id           ON transport_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_school_id         ON transport_routes(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_stops_school_id          ON transport_stops(school_id);
CREATE INDEX IF NOT EXISTS idx_transport_student_assign_school_id ON transport_student_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id                    ON users(school_id);

-- ── foreign-key indexes for common joins/lookups ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id             ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id               ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assign_id   ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id  ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id            ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id              ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_installments_assignment_id     ON fee_installments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_assignment_id         ON fee_payments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id            ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student_id                    ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_hall_tickets_student_id            ON hall_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_class_diary_teacher_id             ON class_diary(teacher_id);
CREATE INDEX IF NOT EXISTS idx_marks_teacher_id                   ON marks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_meeting_slots_teacher_id           ON meeting_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_student_id        ON meeting_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_teacher_appts_teacher_id    ON parent_teacher_appointments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_parent_teacher_appts_student_id    ON parent_teacher_appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id      ON teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_id               ON timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_student_id       ON student_transport(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_student_id ON student_fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_fees_student_id          ON transport_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_student_assign_student_id ON transport_student_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_bus_id            ON transport_routes(bus_id);
CREATE INDEX IF NOT EXISTS idx_transport_routes_driver_id         ON transport_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_transport_stops_route_id           ON transport_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_route_id         ON student_transport(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_student_assign_bus_id    ON transport_student_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_transport_student_assign_route_id  ON transport_student_assignments(route_id);
