package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.SchoolEvent;
import com.schoolers.service.SchoolEventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/calendar")
public class SchoolCalendarController {

    @Autowired private SchoolEventService eventService;
    @Autowired private com.schoolers.repository.UserRepository userRepository;

    private Long getSchoolId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getSchoolId()).orElse(null);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SchoolEvent>>> getEvents(
            Authentication auth,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        Long schoolId = getSchoolId(auth);
        return ResponseEntity.ok(eventService.getEvents(schoolId, from, to));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SchoolEvent>> createEvent(
            @RequestBody Map<String, Object> body, Authentication auth) {
        Long schoolId = getSchoolId(auth);
        var result = eventService.createEvent(body, auth, schoolId);
        return result.isSuccess() ? ResponseEntity.status(201).body(result) : ResponseEntity.badRequest().body(result);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SchoolEvent>> updateEvent(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long schoolId = getSchoolId(auth);
        var result = eventService.updateEvent(id, body, schoolId);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteEvent(
            @PathVariable Long id, Authentication auth) {
        Long schoolId = getSchoolId(auth);
        var result = eventService.deleteEvent(id, schoolId);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }
}
