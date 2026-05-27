package com.schoolers.controller;

import com.schoolers.model.LeaveRequest;
import com.schoolers.repository.LeaveRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping("/api/leave")
public class LeaveAcknowledgeController {

    @Autowired
    private LeaveRequestRepository leaveRepository;

    /** Public endpoint — parent clicks email link to acknowledge their child's leave. */
    @GetMapping("/parent-ack")
    public ResponseEntity<?> acknowledgeLeave(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid token."));
        }
        LeaveRequest leave = leaveRepository.findByParentToken(token).orElse(null);
        if (leave == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link."));
        }
        if (Boolean.TRUE.equals(leave.getParentAcknowledged())) {
            return ResponseEntity.ok(Map.of("message", "Already acknowledged.", "studentName", leave.getRequesterName()));
        }
        leave.setParentAcknowledged(true);
        leave.setParentAcknowledgedAt(LocalDateTime.now(ZoneOffset.UTC));
        leaveRepository.save(leave);
        return ResponseEntity.ok(Map.of(
            "message", "Thank you! Leave acknowledged successfully.",
            "studentName", leave.getRequesterName(),
            "fromDate", leave.getFromDate().toString(),
            "toDate", leave.getToDate().toString()
        ));
    }
}
