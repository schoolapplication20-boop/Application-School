package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Homework;
import com.schoolers.service.HomeworkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/homework")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class HomeworkController {

    @Autowired
    private HomeworkService homeworkService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<Homework>>> getAll(
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String classSection) {
        if (teacherId != null) return ResponseEntity.ok(homeworkService.getByTeacher(teacherId));
        if (classSection != null) return ResponseEntity.ok(homeworkService.getByClass(classSection));
        return ResponseEntity.ok(homeworkService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        var response = homeworkService.create(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = homeworkService.update(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = homeworkService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
