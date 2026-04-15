package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ClassDiary;
import com.schoolers.model.Teacher;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.ClassDiaryService;
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
@CrossOrigin(origins = {
    "http://localhost:3000", "http://localhost:3001",
    "http://localhost:5173", "http://127.0.0.1:5173"
})
public class ClassDiaryController {

    @Autowired
    private ClassDiaryService diaryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    /** Resolve the Teacher entity from the JWT principal. */
    private Optional<Teacher> resolveTeacher(Authentication auth) {
        if (auth == null) return Optional.empty();
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .flatMap(u -> teacherRepository.findByUserId(u.getId()));
    }

    // ── Admin / Super Admin ───────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getAll(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(diaryService.getAll(className, teacherId, date));
    }

    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = diaryService.updateReview(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = diaryService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── Teacher ───────────────────────────────────────────────────────────────

    /** Teacher: get their own diary entries */
    @GetMapping("/teacher")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getForTeacher(Authentication auth) {
        Optional<Teacher> teacherOpt = resolveTeacher(auth);
        if (teacherOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found"));
        return ResponseEntity.ok(diaryService.getForTeacher(teacherOpt.get().getId()));
    }

    /** Teacher / Admin: create a diary entry */
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        // Inject teacherId from JWT so frontend cannot spoof it
        Optional<Teacher> teacherOpt = resolveTeacher(auth);
        if (teacherOpt.isPresent()) {
            Teacher t = teacherOpt.get();
            body.put("teacherId", t.getId());
            if (!body.containsKey("teacherName") || body.get("teacherName") == null) {
                body.put("teacherName", t.getName());
            }
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
        Optional<Teacher> teacherOpt = resolveTeacher(auth);
        if (teacherOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found"));
        var response = diaryService.update(id, body, teacherOpt.get().getId());
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Shared (Teacher / Parent / Admin) ─────────────────────────────────────

    /** Get diary for a specific class (parent / admin use) */
    @GetMapping("/class/{className}")
    @PreAuthorize("hasAnyRole('PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getByClass(@PathVariable String className) {
        return ResponseEntity.ok(diaryService.getByClass(className));
    }
}
