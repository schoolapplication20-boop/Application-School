package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Announcement;
import com.schoolers.service.AnnouncementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AnnouncementController {

    @Autowired
    private AnnouncementService announcementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<Announcement>>> getAll(
            @RequestParam(required = false) String role) {
        if (role != null) return ResponseEntity.ok(announcementService.getForRole(role));
        return ResponseEntity.ok(announcementService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        var response = announcementService.create(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = announcementService.update(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = announcementService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
