package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ClassDiary;
import com.schoolers.model.ClassRoom;
import com.schoolers.model.SchoolDiaryConfig;
import com.schoolers.model.Teacher;
import com.schoolers.repository.ClassDiaryRepository;
import com.schoolers.repository.ClassRoomRepository;
import com.schoolers.repository.SchoolDiaryConfigRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.CurrentUserUtil;
import com.schoolers.service.ClassDiaryService;
import com.schoolers.service.TeacherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/diary")
public class ClassDiaryController {

    @Autowired private ClassDiaryService            diaryService;
    @Autowired private TeacherService               teacherService;
    @Autowired private UserRepository               userRepository;
    @Autowired private ClassDiaryRepository         diaryRepository;
    @Autowired private TeacherRepository            teacherRepository;
    @Autowired private CurrentUserUtil              currentUserUtil;
    @Autowired private SchoolDiaryConfigRepository  diaryConfigRepository;
    @Autowired private ClassRoomRepository          classRoomRepository;

    /** Resolve the Teacher entity from the JWT principal. */
    private Optional<Teacher> resolveTeacher(Authentication auth) {
        if (auth == null) return Optional.empty();
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .flatMap(u -> teacherRepository.findByUserId(u.getId()));
    }

    /** Returns true when the caller is the school's designated Diary Coordinator. */
    private boolean isDesignatedCoordinator(Long schoolId, Long callerUserId) {
        if (schoolId == null || callerUserId == null) return false;
        SchoolDiaryConfig cfg = diaryConfigRepository.findBySchoolId(schoolId).orElse(null);
        return cfg != null
            && "COORDINATOR".equals(cfg.getDiaryMode())
            && callerUserId.equals(cfg.getCoordinatorUserId());
    }

    // ── Coordinator helpers (accessible by TEACHER) ───────────────────────────

    /**
     * Tells the frontend whether the logged-in user is the school's Diary Coordinator.
     * Used by the Diary/Homework page to decide which classes to show and whether
     * to display the coordinator banner.
     */
    @GetMapping("/coordinator-check")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> coordinatorCheck(Authentication auth) {
        Long schoolId     = currentUserUtil.getCurrentSchoolId(auth);
        Long callerUserId = currentUserUtil.getCurrentUserId(auth);
        SchoolDiaryConfig cfg = schoolId != null
            ? diaryConfigRepository.findBySchoolId(schoolId).orElse(null) : null;
        boolean coordinator = isDesignatedCoordinator(schoolId, callerUserId);
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of(
            "isCoordinator", coordinator,
            "diaryMode",     cfg != null ? cfg.getDiaryMode() : "SUBJECT_TEACHER"
        )));
    }

    /**
     * Returns ALL classes for the school — for use by the coordinator when
     * they need to select any class while creating a diary entry.
     * Admins always have access; teachers can use it only when they are the coordinator.
     */
    @GetMapping("/all-classes")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getAllClasses(Authentication auth) {
        Long schoolId     = currentUserUtil.getCurrentSchoolId(auth);
        Long callerUserId = currentUserUtil.getCurrentUserId(auth);
        boolean isAdmin   = userRepository.findByEmailIgnoreCase(auth.getName())
            .map(u -> "ADMIN".equals(u.getRole().name()) || "SUPER_ADMIN".equals(u.getRole().name()))
            .orElse(false);
        if (!isAdmin && !isDesignatedCoordinator(schoolId, callerUserId)) {
            return ResponseEntity.status(403)
                .body(ApiResponse.error("Only coordinators and admins can list all classes"));
        }
        List<ClassRoom> classes = schoolId != null
            ? classRoomRepository.findBySchoolId(schoolId) : List.of();
        return ResponseEntity.ok(ApiResponse.success("OK", classes));
    }

    // ── Admin / Super Admin ───────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getAll(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String date,
            Authentication auth) {
        return ResponseEntity.ok(diaryService.getAll(className, teacherId, date, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Authentication auth) {
        var response = diaryService.updateReview(id, body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        var response = diaryService.delete(id, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── Teacher ───────────────────────────────────────────────────────────────

    /** Teacher: get their own diary entries */
    @GetMapping("/teacher")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getForTeacher(Authentication auth) {
        Optional<Teacher> teacherOpt = resolveTeacher(auth);
        if (teacherOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found"));
        return ResponseEntity.ok(diaryService.getForTeacher(teacherOpt.get().getId(), currentUserUtil.getCurrentSchoolId(auth)));
    }

    /** Teacher / Admin: create a diary entry */
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        // Always inject schoolId from JWT — never trust the client-supplied value
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (schoolId != null) body.put("schoolId", schoolId);

        // Always inject currentUserId from JWT — never trust the client-supplied value.
        // This is the value used by the COORDINATOR diary-mode check in ClassDiaryService.
        Long callerUserId = currentUserUtil.getCurrentUserId(auth);
        if (callerUserId != null) body.put("currentUserId", callerUserId);

        // Inject teacherId / teacherName from JWT so frontend cannot spoof them
        boolean coordinator = isDesignatedCoordinator(schoolId, callerUserId);
        Optional<Teacher> teacherOpt = resolveTeacher(auth);

        if (teacherOpt.isPresent()) {
            Teacher t = teacherOpt.get();
            body.put("teacherId", t.getId());
            if (!body.containsKey("teacherName") || body.get("teacherName") == null) {
                body.put("teacherName", t.getName());
            }

            // Coordinator skips the class-assignment check; regular teachers do not.
            if (!coordinator) {
                String submittedClass   = body.get("className") != null ? body.get("className").toString().trim() : null;
                String submittedSection = body.get("section")   != null ? body.get("section").toString().trim()   : null;
                if (submittedClass != null) {
                    List<ClassRoom> assignedClasses = teacherService.getTeacherClasses(t.getId()).getData();
                    boolean authorized = assignedClasses != null && assignedClasses.stream().anyMatch(cls -> {
                        boolean nameMatch = cls.getName().equalsIgnoreCase(submittedClass);
                        if (!nameMatch) return false;
                        if (submittedSection == null || submittedSection.isEmpty()) return true;
                        return submittedSection.equalsIgnoreCase(cls.getSection());
                    });
                    if (!authorized) {
                        return ResponseEntity.status(403).body(
                            ApiResponse.error("You are not assigned to " + submittedClass +
                                (submittedSection != null && !submittedSection.isEmpty() ? " – " + submittedSection : "")));
                    }
                }
            }
        } else if (coordinator) {
            // ADMIN / SUPER_ADMIN coordinator: no teacher profile exists.
            // class_diary.teacher_id is a plain NOT NULL BIGINT (no FK constraint),
            // so storing the user's ID here is safe and lets the entry be created.
            body.put("teacherId", callerUserId);
            userRepository.findByEmailIgnoreCase(auth.getName())
                .ifPresent(u -> body.put("teacherName", u.getName()));
        }
        var response = diaryService.create(body);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    /** Teacher: update their own diary entry */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        // ADMIN and SUPER_ADMIN can update any diary entry without needing a teacher profile
        if (auth != null) {
            var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
            if (userOpt.isPresent()) {
                String role = userOpt.get().getRole() != null ? userOpt.get().getRole().name() : "";
                if ("ADMIN".equals(role) || "SUPER_ADMIN".equals(role)) {
                    // Fetch the entry's own teacherId so the service ownership check passes
                    ClassDiary diary = diaryRepository.findById(id).orElse(null);
                    if (diary == null) return ResponseEntity.notFound().build();
                    var response = diaryService.update(id, body, diary.getTeacherId());
                    return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
                }
            }
        }
        Optional<Teacher> teacherOpt = resolveTeacher(auth);
        if (teacherOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found"));
        var response = diaryService.update(id, body, teacherOpt.get().getId());
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Shared (Teacher / Parent / Admin) ─────────────────────────────────────

    /** Get diary for a specific class (parent / admin use) */
    @GetMapping("/class/{className}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getByClass(@PathVariable String className, Authentication auth) {
        return ResponseEntity.ok(diaryService.getByClass(className, currentUserUtil.getCurrentSchoolId(auth)));
    }
}
