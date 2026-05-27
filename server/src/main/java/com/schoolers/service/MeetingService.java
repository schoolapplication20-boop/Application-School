package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MeetingService {

    @Autowired private MeetingSlotRepository   slotRepository;
    @Autowired private MeetingBookingRepository bookingRepository;
    @Autowired private TeacherRepository        teacherRepository;
    @Autowired private StudentRepository        studentRepository;
    @Autowired private UserRepository           userRepository;
    @Autowired private SchoolRepository         schoolRepository;
    @Autowired private EmailService             emailService;

    // ── Teacher: create slot ──────────────────────────────────────────────────

    public ApiResponse<MeetingSlot> createSlot(Map<String, Object> body, Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
        Teacher teacher = teacherOpt.get();

        String dateStr = str(body, "meetingDate");
        String start   = str(body, "startTime");
        String end     = str(body, "endTime");
        if (dateStr == null || start == null || end == null)
            return ApiResponse.error("meetingDate, startTime, and endTime are required");

        LocalDate meetingDate;
        try { meetingDate = LocalDate.parse(dateStr); } catch (Exception e) {
            return ApiResponse.error("Invalid date format");
        }
        if (meetingDate.isBefore(LocalDate.now()))
            return ApiResponse.error("Meeting date cannot be in the past");

        MeetingSlot slot = MeetingSlot.builder()
                .teacherId(teacher.getId())
                .teacherName(teacher.getName())
                .schoolId(teacher.getSchoolId())
                .meetingDate(meetingDate)
                .startTime(start)
                .endTime(end)
                .topic(str(body, "topic"))
                .maxBookings(1)
                .build();

        return ApiResponse.success("Slot created", slotRepository.save(slot));
    }

    // ── Teacher: view own slots ───────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> getTeacherSlots(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
        Long teacherId = teacherOpt.get().getId();

        List<MeetingSlot> slots = slotRepository.findByTeacherIdAndMeetingDateGreaterThanEqualOrderByMeetingDateAscStartTimeAsc(
                teacherId, LocalDate.now().minusDays(1));

        List<Map<String, Object>> result = slots.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("slot", s);
            m.put("bookings", bookingRepository.findBySlotIdOrderByCreatedAtAsc(s.getId()));
            return m;
        }).collect(Collectors.toList());

        return ApiResponse.success(result);
    }

    // ── Teacher: delete slot ──────────────────────────────────────────────────

    public ApiResponse<String> deleteSlot(Long slotId, Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");

        MeetingSlot slot = slotRepository.findById(slotId).orElse(null);
        if (slot == null) return ApiResponse.error("Slot not found");
        if (!slot.getTeacherId().equals(teacherOpt.get().getId()))
            return ApiResponse.error("Unauthorized");

        slotRepository.deleteById(slotId);
        return ApiResponse.success("Slot deleted");
    }

    // ── Student: available slots ──────────────────────────────────────────────

    public ApiResponse<List<MeetingSlot>> getAvailableSlots(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        Long schoolId = userOpt.get().getSchoolId();
        List<MeetingSlot> slots = slotRepository
                .findBySchoolIdAndIsAvailableTrueAndMeetingDateGreaterThanEqualOrderByMeetingDateAscStartTimeAsc(
                        schoolId, LocalDate.now());
        return ApiResponse.success(slots);
    }

    // ── Student: book slot ────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<MeetingBooking> bookSlot(Long slotId, Map<String, Object> body, Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");
        Student student = studentOpt.get();

        MeetingSlot slot = slotRepository.findById(slotId).orElse(null);
        if (slot == null) return ApiResponse.error("Slot not found");
        if (!Boolean.TRUE.equals(slot.getIsAvailable())) return ApiResponse.error("Slot is no longer available");
        if (!slot.getSchoolId().equals(student.getSchoolId())) return ApiResponse.error("Unauthorized");

        if (bookingRepository.existsBySlotIdAndStudentId(slotId, student.getId()))
            return ApiResponse.error("You have already booked this slot");

        long confirmed = bookingRepository.countBySlotIdAndStatus(slotId, MeetingBooking.Status.CONFIRMED);
        if (confirmed >= slot.getMaxBookings()) {
            slot.setIsAvailable(false);
            slotRepository.save(slot);
            return ApiResponse.error("Slot is fully booked");
        }

        MeetingBooking booking = MeetingBooking.builder()
                .slotId(slotId)
                .studentId(student.getId())
                .studentName(student.getName())
                .parentName(student.getParentName())
                .parentEmail(student.getParentEmail())
                .schoolId(student.getSchoolId())
                .notes(str(body, "notes"))
                .build();

        MeetingBooking saved = bookingRepository.save(booking);

        // Mark slot unavailable if max reached
        if (confirmed + 1 >= slot.getMaxBookings()) {
            slot.setIsAvailable(false);
            slotRepository.save(slot);
        }

        // Send confirmation email to parent
        if (student.getParentEmail() != null && !student.getParentEmail().isBlank()) {
            String schoolName = schoolRepository.findById(student.getSchoolId())
                    .map(School::getName).orElse("School");
            emailService.sendMeetingConfirmation(
                student.getParentEmail(),
                student.getName(),
                slot.getTeacherName(),
                slot.getMeetingDate().toString(),
                slot.getStartTime() + " – " + slot.getEndTime(),
                slot.getTopic(),
                schoolName
            );
        }

        return ApiResponse.success("Meeting booked successfully", saved);
    }

    // ── Student: view own bookings ────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> getStudentBookings(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");

        List<MeetingBooking> bookings = bookingRepository
                .findByStudentIdOrderByCreatedAtDesc(studentOpt.get().getId());

        List<Map<String, Object>> result = bookings.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("booking", b);
            slotRepository.findById(b.getSlotId()).ifPresent(s -> m.put("slot", s));
            return m;
        }).collect(Collectors.toList());

        return ApiResponse.success(result);
    }

    // ── Student: cancel booking ───────────────────────────────────────────────

    @Transactional
    public ApiResponse<String> cancelBooking(Long bookingId, Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");

        MeetingBooking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return ApiResponse.error("Booking not found");
        if (!booking.getStudentId().equals(studentOpt.get().getId())) return ApiResponse.error("Unauthorized");

        booking.setStatus(MeetingBooking.Status.CANCELLED);
        bookingRepository.save(booking);

        // Re-open the slot
        slotRepository.findById(booking.getSlotId()).ifPresent(s -> {
            s.setIsAvailable(true);
            slotRepository.save(s);
        });

        return ApiResponse.success("Booking cancelled");
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }
}
