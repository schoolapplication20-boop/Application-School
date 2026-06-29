package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Student;
import com.schoolers.model.StudentDeletionRequest;
import com.schoolers.repository.StudentDeletionRequestRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.CurrentUserUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Student deletion approval workflow.
 * ADMIN  → submits a deletion request (queued, PENDING).
 * SA     → submitting applies immediately (soft-delete + audit record).
 * SA     → approves/rejects ADMIN-submitted requests.
 */
@Service
public class StudentDeletionRequestService {

    @Autowired private StudentDeletionRequestRepository requestRepo;
    @Autowired private StudentRepository                studentRepository;
    @Autowired private UserRepository                    userRepository;
    @Autowired private CurrentUserUtil                   currentUserUtil;
    @Autowired private AuditLogService                   auditLogService;

    // ── auth helpers ─────────────────────────────────────────────────────────

    private boolean isSuperAdmin(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }

    private String getDisplayName(Authentication auth) {
        if (auth == null) return "Unknown";
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getName() != null ? u.getName() : auth.getName())
                .orElse(auth.getName());
    }

    private String getRole(Authentication auth) {
        return isSuperAdmin(auth) ? "SUPER_ADMIN" : "ADMIN";
    }

    // ── Create deletion request (ADMIN → queued; SUPER_ADMIN → direct) ───────

    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRequest(
            Long studentId, String reason, Authentication auth) {

        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        Long userId   = currentUserUtil.getCurrentUserId(auth);
        if (schoolId == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("School context not found"));
        if (reason == null || reason.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("A reason is required to request student deletion"));

        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty() || !schoolId.equals(studentOpt.get().getSchoolId()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Student not found"));

        Student student = studentOpt.get();
        if (Boolean.FALSE.equals(student.getIsActive()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Student is already inactive"));
        if (requestRepo.existsByStudentIdAndStatus(studentId, "PENDING"))
            return ResponseEntity.badRequest().body(ApiResponse.error(
                    "A deletion request is already pending for this student"));

        // Super Admins apply immediately — no approval queue, but an audit record is still created.
        if (isSuperAdmin(auth))
            return applyDirectly(student, reason, schoolId, userId, auth);

        StudentDeletionRequest req = StudentDeletionRequest.builder()
                .requestId(UUID.randomUUID().toString())
                .studentId(studentId)
                .schoolId(schoolId)
                .studentName(student.getName())
                .className(student.getClassName())
                .requestedByUserId(userId)
                .requestedByName(getDisplayName(auth))
                .reason(reason)
                .status("PENDING")
                .requestedAt(LocalDateTime.now())
                .build();
        requestRepo.save(req);

        student.setDeletionStatus("PENDING");
        studentRepository.save(student);

        auditLogService.log(userId, getDisplayName(auth), getRole(auth), schoolId,
                "REQUEST_DELETE", "Student", studentId,
                "Requested deletion of student: " + student.getName() + " — reason: " + reason, null);

        return ResponseEntity.ok(ApiResponse.success("Deletion request submitted — awaiting Super Admin approval", Map.of(
                "requestId", req.getRequestId(),
                "status", "PENDING"
        )));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> applyDirectly(
            Student student, String reason, Long schoolId, Long userId, Authentication auth) {
        softDelete(student);

        StudentDeletionRequest audit = StudentDeletionRequest.builder()
                .requestId(UUID.randomUUID().toString())
                .studentId(student.getId())
                .schoolId(schoolId)
                .studentName(student.getName())
                .className(student.getClassName())
                .requestedByUserId(userId)
                .requestedByName(getDisplayName(auth))
                .reason(reason)
                .status("APPROVED")
                .approvedByUserId(userId)
                .approvedByName(getDisplayName(auth))
                .decisionNotes("Applied directly by Super Admin")
                .requestedAt(LocalDateTime.now())
                .actionedAt(LocalDateTime.now())
                .build();
        requestRepo.save(audit);

        auditLogService.log(userId, getDisplayName(auth), "SUPER_ADMIN", schoolId,
                "DELETE", "Student", student.getId(),
                "Soft-deleted student: " + student.getName() + " — reason: " + reason, null);

        return ResponseEntity.ok(ApiResponse.success("Student deleted and login disabled", Map.of(
                "status", "APPROVED"
        )));
    }

    /** Soft-deletes the student and disables their login account. Does not remove any rows. */
    private void softDelete(Student student) {
        student.setIsActive(false);
        student.setDeletionStatus("NONE");
        studentRepository.save(student);

        if (student.getStudentUserId() != null) {
            userRepository.findById(student.getStudentUserId()).ifPresent(u -> {
                u.setIsActive(false);
                userRepository.save(u);
            });
        } else {
            userRepository.findByStudentId(student.getId()).ifPresent(u -> {
                u.setIsActive(false);
                userRepository.save(u);
            });
        }
    }

    // ── List requests ─────────────────────────────────────────────────────────

    public ResponseEntity<ApiResponse<List<StudentDeletionRequest>>> listRequests(Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        List<StudentDeletionRequest> list = isSuperAdmin(auth)
                ? requestRepo.findBySchoolIdOrderByRequestedAtDesc(schoolId)
                : requestRepo.findByRequestedByUserIdOrderByRequestedAtDesc(currentUserUtil.getCurrentUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // ── Pending count for sidebar badge ───────────────────────────────────────
    // Super Admin sees all school pending requests (things to action).
    // Admin sees only their own pending requests (things awaiting approval).

    public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount(Authentication auth) {
        long count;
        if (isSuperAdmin(auth)) {
            Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
            count = schoolId != null ? requestRepo.countBySchoolIdAndStatus(schoolId, "PENDING") : 0L;
        } else {
            Long userId = currentUserUtil.getCurrentUserId(auth);
            count = userId != null ? requestRepo.countByRequestedByUserIdAndStatus(userId, "PENDING") : 0L;
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("pendingCount", count)));
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    @Transactional
    public ResponseEntity<ApiResponse<StudentDeletionRequest>> approve(
            Long id, String notes, Authentication auth) {

        Optional<StudentDeletionRequest> opt = requestRepo.findByIdForUpdate(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        StudentDeletionRequest req = opt.get();
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (!req.getSchoolId().equals(schoolId))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        if (!"PENDING".equals(req.getStatus()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Request is already " + req.getStatus()));

        Optional<Student> studentOpt = studentRepository.findById(req.getStudentId());
        if (studentOpt.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("Student no longer exists"));

        Long userId = currentUserUtil.getCurrentUserId(auth);
        softDelete(studentOpt.get());

        req.setStatus("APPROVED");
        req.setApprovedByUserId(userId);
        req.setApprovedByName(getDisplayName(auth));
        req.setDecisionNotes(notes);
        req.setActionedAt(LocalDateTime.now());
        requestRepo.save(req);

        auditLogService.log(userId, getDisplayName(auth), "SUPER_ADMIN", schoolId,
                "APPROVE_DELETE", "Student", req.getStudentId(),
                "Approved deletion of student: " + req.getStudentName(), null);

        return ResponseEntity.ok(ApiResponse.success("Request approved — student soft-deleted and login disabled", req));
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    @Transactional
    public ResponseEntity<ApiResponse<StudentDeletionRequest>> reject(
            Long id, String notes, Authentication auth) {

        if (notes == null || notes.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("A rejection reason is required"));

        Optional<StudentDeletionRequest> opt = requestRepo.findByIdForUpdate(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        StudentDeletionRequest req = opt.get();
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (!req.getSchoolId().equals(schoolId))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        if (!"PENDING".equals(req.getStatus()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Request is already " + req.getStatus()));

        Long userId = currentUserUtil.getCurrentUserId(auth);
        req.setStatus("REJECTED");
        req.setApprovedByUserId(userId);
        req.setApprovedByName(getDisplayName(auth));
        req.setDecisionNotes(notes);
        req.setActionedAt(LocalDateTime.now());
        requestRepo.save(req);

        studentRepository.findById(req.getStudentId()).ifPresent(s -> {
            s.setDeletionStatus("NONE");
            studentRepository.save(s);
        });

        auditLogService.log(userId, getDisplayName(auth), "SUPER_ADMIN", schoolId,
                "REJECT_DELETE", "Student", req.getStudentId(),
                "Rejected deletion of student: " + req.getStudentName() + " — reason: " + notes, null);

        return ResponseEntity.ok(ApiResponse.success("Request rejected — student remains active", req));
    }
}
