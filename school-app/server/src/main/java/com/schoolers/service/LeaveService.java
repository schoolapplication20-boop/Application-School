package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.LeaveRequest;
import com.schoolers.model.User;
import com.schoolers.repository.LeaveRequestRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
public class LeaveService {

    @Autowired private LeaveRequestRepository leaveRepository;
    @Autowired private AppNotificationService notificationService;
    @Autowired private UserRepository userRepository;

    public ApiResponse<List<LeaveRequest>> getStudentLeaves() {
        return ApiResponse.success(leaveRepository.findByRequesterType(LeaveRequest.RequesterType.STUDENT));
    }

    public ApiResponse<List<LeaveRequest>> getTeacherLeaves() {
        return ApiResponse.success(leaveRepository.findByRequesterType(LeaveRequest.RequesterType.TEACHER));
    }

    public ApiResponse<List<LeaveRequest>> getLeavesByRequester(Long requesterId, String type) {
        LeaveRequest.RequesterType rt = "TEACHER".equalsIgnoreCase(type)
                ? LeaveRequest.RequesterType.TEACHER
                : LeaveRequest.RequesterType.STUDENT;
        return ApiResponse.success(leaveRepository.findByRequesterIdAndRequesterType(requesterId, rt));
    }

    public ApiResponse<LeaveRequest> createLeave(Map<String, Object> body) {
        String fromDateStr = str(body, "fromDate", null);
        String toDateStr   = str(body, "toDate",   null);
        String requesterTypeStr = str(body, "requesterType", "STUDENT");

        if (fromDateStr == null || toDateStr == null)
            return ApiResponse.error("From date and To date are required");

        LocalDate fromDate, toDate;
        try {
            fromDate = LocalDate.parse(fromDateStr);
            toDate   = LocalDate.parse(toDateStr);
        } catch (DateTimeParseException e) {
            return ApiResponse.error("Invalid date format. Use YYYY-MM-DD");
        }

        String requesterName = str(body, "requesterName", "Unknown");
        String leaveType     = str(body, "leaveType", null);

        LeaveRequest leave = LeaveRequest.builder()
                .requesterType(LeaveRequest.RequesterType.valueOf(requesterTypeStr.toUpperCase()))
                .requesterId(longVal(body, "requesterId", null))
                .requesterName(requesterName)
                .classSection(str(body, "classSection", null))
                .leaveType(leaveType)
                .fromDate(fromDate)
                .toDate(toDate)
                .reason(str(body, "reason", null))
                .status(LeaveRequest.Status.PENDING)
                .build();

        LeaveRequest saved = leaveRepository.save(leave);

        // ── Notify all admins and super-admins about the new leave request ──────
        if (LeaveRequest.RequesterType.TEACHER.name().equals(requesterTypeStr.toUpperCase())) {
            String msg = "New leave request from " + requesterName
                    + (leaveType != null ? " (" + leaveType + ")" : "")
                    + ": " + fromDateStr + " → " + toDateStr;
            Stream.concat(
                    userRepository.findByRole(User.Role.ADMIN).stream(),
                    userRepository.findByRole(User.Role.SUPER_ADMIN).stream()
            ).forEach(admin ->
                    notificationService.create(admin.getId(), msg,
                            "event_busy", "#805ad5", "teacher_leave", saved.getId())
            );
        }

        return ApiResponse.success("Leave request submitted", saved);
    }

    public ApiResponse<LeaveRequest> updateStatus(Long id, Map<String, Object> body) {
        return leaveRepository.findById(id)
                .map(leave -> {
                    String statusStr  = str(body, "status", null);
                    String adminComment = str(body, "adminComment", leave.getAdminComment());
                    String reviewedBy   = str(body, "reviewedBy", leave.getReviewedBy());

                    LeaveRequest.Status newStatus = leave.getStatus();
                    if (statusStr != null) {
                        try { newStatus = LeaveRequest.Status.valueOf(statusStr.toUpperCase()); }
                        catch (IllegalArgumentException ignored) {}
                    }

                    leave.setStatus(newStatus);
                    leave.setAdminComment(adminComment);
                    leave.setReviewedBy(reviewedBy);
                    leave.setReviewedAt(LocalDateTime.now());
                    LeaveRequest saved = leaveRepository.save(leave);

                    // ── Notify the teacher about the admin's decision ────────────
                    if (saved.getRequesterId() != null
                            && saved.getRequesterType() == LeaveRequest.RequesterType.TEACHER) {

                        boolean approved = newStatus == LeaveRequest.Status.APPROVED;
                        String decision  = approved ? "approved" : "rejected";
                        String msg = "Your leave request ("
                                + saved.getFromDate() + " → " + saved.getToDate()
                                + ") has been " + decision + " by Admin."
                                + (adminComment != null && !adminComment.isBlank()
                                        ? " Remark: " + adminComment : "");

                        notificationService.create(
                                saved.getRequesterId(), msg,
                                approved ? "check_circle" : "cancel",
                                approved ? "#76C442"      : "#e53e3e",
                                "leave_decision", saved.getId());
                    }

                    return ApiResponse.success("Leave status updated", saved);
                })
                .orElse(ApiResponse.error("Leave request not found"));
    }

    public ApiResponse<String> delete(Long id) {
        if (!leaveRepository.existsById(id)) return ApiResponse.error("Leave request not found");
        leaveRepository.deleteById(id);
        return ApiResponse.success("Leave request deleted", "Deleted");
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }
}
