package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Teacher;
import com.schoolers.model.TeacherAttendance;
import com.schoolers.model.User;
import com.schoolers.repository.TeacherAttendanceRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TeacherAttendanceService {

    @Autowired private TeacherAttendanceRepository repo;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private UserRepository userRepository;

    /** Teacher marks their own attendance for today */
    public ApiResponse<TeacherAttendance> markAttendance(Map<String, Object> body, Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
        Teacher teacher = teacherOpt.get();

        String statusStr = str(body, "status", null);
        if (statusStr == null) return ApiResponse.error("Status is required");

        TeacherAttendance.Status status;
        try {
            status = TeacherAttendance.Status.valueOf(statusStr.toUpperCase());
        } catch (Exception e) {
            return ApiResponse.error("Invalid status. Use PRESENT, ABSENT or LEAVE");
        }

        LocalDate date = LocalDate.now();
        String note = str(body, "note", null);
        if (note != null && note.length() > 500)
            return ApiResponse.error("Note cannot exceed 500 characters");

        // Upsert — update if already marked today
        TeacherAttendance record = repo.findByTeacherIdAndDate(teacher.getId(), date)
                .orElse(TeacherAttendance.builder()
                        .teacherId(teacher.getId())
                        .teacherName(user.getName())
                        .schoolId(user.getSchoolId())
                        .date(date)
                        .build());

        record.setStatus(status);
        record.setNote(note);
        return ApiResponse.success("Attendance marked", repo.save(record));
    }

    /** Teacher views their own attendance (current month by default) */
    public ApiResponse<List<Map<String, Object>>> getMyAttendance(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) return ApiResponse.success(List.of());
        Teacher teacher = teacherOpt.get();

        LocalDate from = LocalDate.now().withDayOfMonth(1);
        LocalDate to   = LocalDate.now();

        List<TeacherAttendance> records = repo.findByTeacherIdAndDateBetweenOrderByDateDesc(
                teacher.getId(), from, to);

        return ApiResponse.success(records.stream().map(this::toDto).collect(Collectors.toList()));
    }

    /** Today's status for the logged-in teacher */
    public ApiResponse<Map<String, Object>> getTodayStatus(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Teacher> teacherOpt = teacherRepository.findByUserId(user.getId());
        if (teacherOpt.isEmpty()) return ApiResponse.success(null);

        return repo.findByTeacherIdAndDate(teacherOpt.get().getId(), LocalDate.now())
                .map(r -> ApiResponse.success(toDto(r)))
                .orElse(ApiResponse.success(null));
    }

    /** Admin / Super Admin: all teacher attendance for school on a given date */
    public ApiResponse<List<Map<String, Object>>> getByDate(String dateStr, Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");
        if (user.getSchoolId() == null) return ApiResponse.error("No school context");

        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : LocalDate.now();
        List<TeacherAttendance> records = repo.findBySchoolIdAndDateOrderByTeacherNameAsc(user.getSchoolId(), date);
        return ApiResponse.success(records.stream().map(this::toDto).collect(Collectors.toList()));
    }

    /** Admin / Super Admin: teacher attendance for a date range */
    public ApiResponse<List<Map<String, Object>>> getByRange(String from, String to, Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");
        if (user.getSchoolId() == null) return ApiResponse.error("No school context");

        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now().withDayOfMonth(1);
        LocalDate toDate   = to   != null ? LocalDate.parse(to)   : LocalDate.now();

        List<TeacherAttendance> records = repo.findBySchoolIdAndDateBetweenOrderByDateDesc(
                user.getSchoolId(), fromDate, toDate);
        return ApiResponse.success(records.stream().map(this::toDto).collect(Collectors.toList()));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> toDto(TeacherAttendance r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          r.getId());
        m.put("teacherId",   r.getTeacherId());
        m.put("teacherName", r.getTeacherName());
        m.put("date",        r.getDate().toString());
        m.put("status",      r.getStatus().name());
        m.put("note",        r.getNote());
        m.put("createdAt",   r.getCreatedAt());
        return m;
    }

    private User resolveUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }
}
