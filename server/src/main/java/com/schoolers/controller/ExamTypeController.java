package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ExamType;
import com.schoolers.model.User;
import com.schoolers.repository.ExamTypeRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class ExamTypeController {

    @Autowired private ExamTypeRepository examTypeRepository;
    @Autowired private UserRepository     userRepository;

    private Long schoolId(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
    }

    /** Admin/super_admin: list all exam types for their school */
    @GetMapping("/api/admin/exam-types")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> list(Authentication auth) {
        Long sid = schoolId(auth);
        if (sid == null) return ResponseEntity.status(403).body(ApiResponse.error("School not found"));
        return ResponseEntity.ok(ApiResponse.success(examTypeRepository.findBySchoolIdOrderByDisplayOrderAscNameAsc(sid)));
    }

    /** Teachers: list active exam types for their school */
    @GetMapping("/api/teacher/exam-types")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> listForTeacher(Authentication auth) {
        Long sid = schoolId(auth);
        if (sid == null) return ResponseEntity.ok(ApiResponse.success(List.of()));
        return ResponseEntity.ok(ApiResponse.success(
                examTypeRepository.findBySchoolIdAndIsActiveTrueOrderByDisplayOrderAscNameAsc(sid)));
    }

    /** Students: list active exam types (for report card dropdown) */
    @GetMapping("/api/student/exam-types")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> listForStudent(Authentication auth) {
        Long sid = schoolId(auth);
        if (sid == null) return ResponseEntity.ok(ApiResponse.success(List.of()));
        return ResponseEntity.ok(ApiResponse.success(
                examTypeRepository.findBySchoolIdAndIsActiveTrueOrderByDisplayOrderAscNameAsc(sid)));
    }

    /** Admin/super_admin: create exam type */
    @PostMapping("/api/admin/exam-types")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        Long sid = schoolId(auth);
        if (sid == null) return ResponseEntity.status(403).body(ApiResponse.error("School not found"));

        String name = (String) body.get("name");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        if (examTypeRepository.existsBySchoolIdAndNameIgnoreCase(sid, name.trim()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Exam type '" + name.trim() + "' already exists"));

        Integer order = body.get("displayOrder") != null ? Integer.valueOf(body.get("displayOrder").toString()) : 0;

        ExamType et = ExamType.builder()
                .schoolId(sid)
                .name(name.trim())
                .displayOrder(order)
                .isActive(true)
                .build();
        return ResponseEntity.status(201).body(ApiResponse.success("Exam type created", examTypeRepository.save(et)));
    }

    /** Admin/super_admin: update exam type */
    @PutMapping("/api/admin/exam-types/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        Long sid = schoolId(auth);
        ExamType et = examTypeRepository.findById(id).orElse(null);
        if (et == null) return ResponseEntity.status(404).body(ApiResponse.error("Not found"));
        if (!et.getSchoolId().equals(sid)) return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized"));

        if (body.containsKey("name") && body.get("name") != null) {
            String newName = ((String) body.get("name")).trim();
            if (!newName.equalsIgnoreCase(et.getName()) && examTypeRepository.existsBySchoolIdAndNameIgnoreCase(sid, newName))
                return ResponseEntity.badRequest().body(ApiResponse.error("Exam type '" + newName + "' already exists"));
            et.setName(newName);
        }
        if (body.containsKey("displayOrder") && body.get("displayOrder") != null)
            et.setDisplayOrder(Integer.valueOf(body.get("displayOrder").toString()));
        if (body.containsKey("isActive") && body.get("isActive") != null)
            et.setIsActive(Boolean.parseBoolean(body.get("isActive").toString()));

        return ResponseEntity.ok(ApiResponse.success("Updated", examTypeRepository.save(et)));
    }

    /** Admin/super_admin: delete exam type */
    @DeleteMapping("/api/admin/exam-types/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long sid = schoolId(auth);
        ExamType et = examTypeRepository.findById(id).orElse(null);
        if (et == null) return ResponseEntity.status(404).body(ApiResponse.error("Not found"));
        if (!et.getSchoolId().equals(sid)) return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized"));
        examTypeRepository.delete(et);
        return ResponseEntity.ok(ApiResponse.success("Deleted"));
    }
}
