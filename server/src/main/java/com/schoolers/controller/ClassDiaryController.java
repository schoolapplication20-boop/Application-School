package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ClassDiary;
import com.schoolers.service.ClassDiaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diary")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ClassDiaryController {

    @Autowired
    private ClassDiaryService diaryService;

    // Super Admin / Admin: get all with optional filters
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getAll(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String date) {
        return ResponseEntity.ok(diaryService.getAll(className, teacherId, date));
    }

    // Parent / Teacher: get diary for a specific class
    @GetMapping("/class/{className}")
    @PreAuthorize("hasAnyRole('PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassDiary>>> getByClass(@PathVariable String className) {
        return ResponseEntity.ok(diaryService.getByClass(className));
    }

    // Teacher: upload a new diary entry
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        var response = diaryService.create(body);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    // Admin / Super Admin: update review status & add comment
    @PatchMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = diaryService.updateReview(id, body);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    // Admin / Super Admin: delete entry
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = diaryService.delete(id);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.notFound().build();
    }
}
