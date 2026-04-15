package com.schoolers.config;

import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
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
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            // ── Role Hierarchy ─────────────────────────────────────────────────────
            // APPLICATION_OWNER : platform-level account, schoolId = NULL.
            //                     Manages all schools. Creates SUPER_ADMINs.
            // SUPER_ADMIN        : school-level owner, schoolId = NOT NULL.
            //                     Exactly ONE per school. Created by APPLICATION_OWNER.
            // ADMIN              : created by SUPER_ADMIN, scoped to their school.
            //
            // DataInitializer ONLY seeds APPLICATION_OWNER.
            // SUPER_ADMINs are created at runtime by APPLICATION_OWNER via the platform dashboard.
            // ──────────────────────────────────────────────────────────────────────
            userRepo.findByEmailIgnoreCase("superadmin@schoolers.com").ifPresentOrElse(
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
                    // This seed account must always be APPLICATION_OWNER (platform-level).
                    // If somehow it was changed to SUPER_ADMIN or another role, correct it.
                    if (existing.getRole() != User.Role.APPLICATION_OWNER) {
                        existing.setRole(User.Role.APPLICATION_OWNER);
                        changed = true;
                        System.out.println("  [DataInitializer] Corrected role to APPLICATION_OWNER for: " + existing.getEmail());
                    }
                    // APPLICATION_OWNER must never have a schoolId — it is platform-level.
                    // A schoolId would incorrectly scope this account to a single school.
                    if (existing.getSchoolId() != null) {
                        existing.setSchoolId(null);
                        changed = true;
                        System.out.println("  [DataInitializer] Cleared schoolId from APPLICATION_OWNER account.");
                    }
                    if (changed) {
                        userRepo.save(existing);
                        System.out.println("  [DataInitializer] APPLICATION_OWNER account corrected.");
                    }
                },
                () -> {
                    userRepo.save(User.builder()
                            .name("Application Owner")
                            .email("superadmin@schoolers.com")
                            .mobile("9000000000")
                            .password(passwordEncoder.encode("SuperAdmin@123"))
                            .role(User.Role.APPLICATION_OWNER)
                            .schoolId(null)   // platform-level — no school affiliation
                            .isActive(true)
                            .firstLogin(false)
                            .build());
                    System.out.println("  [DataInitializer] APPLICATION_OWNER created -> superadmin@schoolers.com / SuperAdmin@123");
                }
            );

            // ── Remove demo seed data ──────────────────────────────────────────
            removeDemoData(userRepo, studentRepo, teacherRepo, classRoomRepo);
        };
    }

    private void removeDemoData(
            UserRepository userRepo,
            StudentRepository studentRepo,
            TeacherRepository teacherRepo,
            ClassRoomRepository classRoomRepo
    ) {
        // 1. Seeded teachers and their linked User accounts
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

        // 2. Other seeded users
        for (String email : List.of("admin@schoolers.com", "suresh@schoolers.com", "meena@schoolers.com")) {
            userRepo.findByEmail(email).ifPresent(u -> {
                userRepo.deleteById(u.getId());
                System.out.println("  [DataInitializer] Removed seeded user: " + email);
            });
        }

        // 3. Seeded students
        studentRepo.findAll().stream()
            .filter(s -> "10A001".equals(s.getRollNumber()) || "9A001".equals(s.getRollNumber()))
            .forEach(s -> {
                studentRepo.deleteById(s.getId());
                System.out.println("  [DataInitializer] Removed seeded student: " + s.getRollNumber());
            });

        // 4. Seeded classrooms
        classRoomRepo.findAll().stream()
            .filter(c -> ("10-A".equals(c.getName()) && "Rajesh Kumar".equals(c.getTeacherName()))
                      || ("9-A".equals(c.getName())  && "Priya Sharma".equals(c.getTeacherName())))
            .forEach(c -> {
                classRoomRepo.deleteById(c.getId());
                System.out.println("  [DataInitializer] Removed seeded classroom: " + c.getName());
            });
    }
}
