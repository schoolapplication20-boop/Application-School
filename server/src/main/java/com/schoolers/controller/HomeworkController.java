package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Homework;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.HomeworkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/homework")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class HomeworkController {

    @Autowired
    private HomeworkService homeworkService;

    @Autowired
    private UserRepository userRepository;

    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT', 'STUDENT')")
    public ResponseEntity<ApiResponse<List<Homework>>> getAll(
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String classSection,
            Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        if (teacherId != null) return ResponseEntity.ok(homeworkService.getByTeacher(teacherId, schoolId));
        if (classSection != null) return ResponseEntity.ok(homeworkService.getByClass(classSection, schoolId));
        return ResponseEntity.ok(homeworkService.getAll(schoolId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = homeworkService.create(body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = homeworkService.update(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        var response = homeworkService.delete(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
