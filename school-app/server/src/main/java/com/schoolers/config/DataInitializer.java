package com.schoolers.config;

import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    @Order(2)
    CommandLineRunner initData(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            ClassRoomRepository classRoomRepo,
            FeeRepository feeRepo,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {

            // ── Ensure Super Admin exists with correct values ──────────────────
            userRepo.findByEmail("superadmin@schoolers.com").ifPresentOrElse(
                existing -> {
                    boolean changed = false;
                    if (!Boolean.TRUE.equals(existing.getIsActive())) {
                        existing.setIsActive(true);
                        changed = true;
                    }
                    if (!Boolean.FALSE.equals(existing.getFirstLogin())) {
                        existing.setFirstLogin(false);
                        changed = true;
                    }
                    if (existing.getRole() != User.Role.SUPER_ADMIN) {
                        existing.setRole(User.Role.SUPER_ADMIN);
                        changed = true;
                    }
                    if (changed) {
                        userRepo.save(existing);
                        System.out.println("  [DataInitializer] Super Admin columns corrected.");
                    }
                },
                () -> {
                    userRepo.save(User.builder()
                            .name("Super Admin")
                            .email("superadmin@schoolers.com")
                            .mobile("9000000000")
                            .password(passwordEncoder.encode("SuperAdmin@123"))
                            .role(User.Role.SUPER_ADMIN)
                            .isActive(true)
                            .firstLogin(false)
                            .build());
                    System.out.println("  [DataInitializer] Super Admin created -> superadmin@schoolers.com / SuperAdmin@123");
                }
            );

            // ── Remove demo seed data (idempotent — no-op if already cleaned) ─
            removeDemoData(userRepo, studentRepo, teacherRepo, classRoomRepo, jdbcTemplate);
        };
    }

    /**
     * Deletes the specific demo records that were auto-seeded on first startup.
     * Only removes records that match BOTH the seeded email/rollNumber AND the
     * expected role/name, so real user-created records are never touched.
     * Safe to run on every startup — is a no-op once the records are gone.
     */
    private void removeDemoData(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            ClassRoomRepository classRoomRepo,
            JdbcTemplate jdbc
    ) {
        // 1. Seeded fees (delete by seeded roll numbers via JDBC)
        try {
            int deleted = jdbc.update(
                "DELETE FROM fees WHERE roll_number IN ('10A001', '9A001')");
            if (deleted > 0) System.out.println("  [DataInitializer] Removed " + deleted + " seeded fee record(s).");
        } catch (Exception ignored) {}

        // 2. Seeded teachers and their linked User accounts
        List<String> seededTeacherEmails = List.of("rajesh@schoolers.com", "priya@schoolers.com");
        for (String email : seededTeacherEmails) {
            userRepo.findByEmail(email).ifPresent(u -> {
                teacherRepo.findAll().stream()
                    .filter(t -> t.getUser() != null && t.getUser().getId().equals(u.getId()))
                    .forEach(t -> {
                        teacherRepo.deleteById(t.getId());
                        System.out.println("  [DataInitializer] Removed seeded teacher: " + email);
                    });
                userRepo.deleteById(u.getId());
            });
        }

        // 3. Other seeded users (admin account, parent accounts)
        for (String email : List.of("admin@schoolers.com", "suresh@schoolers.com", "meena@schoolers.com")) {
            userRepo.findByEmail(email).ifPresent(u -> {
                userRepo.deleteById(u.getId());
                System.out.println("  [DataInitializer] Removed seeded user: " + email);
            });
        }

        // 4. Seeded students (identified by their known roll numbers)
        studentRepo.findAll().stream()
            .filter(s -> "10A001".equals(s.getRollNumber()) || "9A001".equals(s.getRollNumber()))
            .forEach(s -> {
                studentRepo.deleteById(s.getId());
                System.out.println("  [DataInitializer] Removed seeded student: " + s.getRollNumber());
            });

        // 5. Seeded classrooms (matched by both class name AND teacher name for safety)
        classRoomRepo.findAll().stream()
            .filter(c -> ("10-A".equals(c.getName()) && "Rajesh Kumar".equals(c.getTeacherName()))
                      || ("9-A".equals(c.getName())  && "Priya Sharma".equals(c.getTeacherName())))
            .forEach(c -> {
                classRoomRepo.deleteById(c.getId());
                System.out.println("  [DataInitializer] Removed seeded classroom: " + c.getName());
            });
    }
}
