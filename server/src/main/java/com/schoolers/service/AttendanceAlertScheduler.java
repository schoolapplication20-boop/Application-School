package com.schoolers.service;

import com.schoolers.model.Attendance;
import com.schoolers.model.Student;
import com.schoolers.repository.AttendanceRepository;
import com.schoolers.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.logging.Logger;

@Service
public class AttendanceAlertScheduler {

    private static final Logger log = Logger.getLogger(AttendanceAlertScheduler.class.getName());
    private static final double THRESHOLD = 75.0;

    @Autowired private StudentRepository    studentRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private EmailService         emailService;
    @Autowired private com.schoolers.repository.SchoolRepository schoolRepository;

    /** Runs every Monday at 8 AM UTC */
    @Scheduled(cron = "0 0 8 * * MON")
    public void checkLowAttendance() {
        log.info("[AttendanceAlert] Running weekly low-attendance check");

        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate today      = LocalDate.now();

        List<Student> students = studentRepository.findAll();
        int alertsSent = 0;

        for (Student student : students) {
            if (!Boolean.TRUE.equals(student.getIsActive())) continue;
            if (student.getParentEmail() == null || student.getParentEmail().isBlank()) continue;

            List<Attendance> records = attendanceRepository
                    .findByStudentIdAndDateBetween(student.getId(), monthStart, today);

            if (records.isEmpty()) continue;

            long present = records.stream().filter(a ->
                    a.getStatus() == Attendance.Status.PRESENT ||
                    a.getStatus() == Attendance.Status.LATE).count();
            double pct = (present * 100.0) / records.size();

            if (pct < THRESHOLD) {
                String schoolName = schoolRepository.findById(student.getSchoolId())
                        .map(s -> s.getName()).orElse("School");
                String className = student.getClassName()
                        + (student.getSection() != null ? "-" + student.getSection() : "");

                emailService.sendAttendanceAlert(
                    student.getParentEmail(),
                    student.getName(),
                    className,
                    pct,
                    schoolName
                );
                alertsSent++;
            }
        }
        log.info("[AttendanceAlert] Completed. Alerts sent: " + alertsSent);
    }
}
