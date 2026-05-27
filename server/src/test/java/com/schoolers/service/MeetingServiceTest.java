package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MeetingService")
class MeetingServiceTest {

    @InjectMocks private MeetingService meetingService;

    @Mock private MeetingSlotRepository    slotRepository;
    @Mock private MeetingBookingRepository bookingRepository;
    @Mock private TeacherRepository        teacherRepository;
    @Mock private StudentRepository        studentRepository;
    @Mock private UserRepository           userRepository;
    @Mock private SchoolRepository         schoolRepository;
    @Mock private EmailService             emailService;
    @Mock private Authentication           auth;

    private User    teacherUser;
    private Teacher teacher;
    private User    studentUser;
    private Student student;
    private MeetingSlot slot;

    @BeforeEach
    void setUp() {
        teacherUser = new User();
        teacherUser.setId(1L);
        teacherUser.setEmail("teacher@school.com");
        teacherUser.setSchoolId(5L);

        teacher = new Teacher();
        teacher.setId(10L);
        teacher.setName("Ms. Smith");
        teacher.setSchoolId(5L);

        studentUser = new User();
        studentUser.setId(2L);
        studentUser.setEmail("student@school.com");
        studentUser.setSchoolId(5L);

        student = new Student();
        student.setId(20L);
        student.setName("John Doe");
        student.setSchoolId(5L);
        student.setParentEmail(null);

        slot = MeetingSlot.builder()
                .teacherId(10L)
                .teacherName("Ms. Smith")
                .schoolId(5L)
                .meetingDate(LocalDate.now().plusDays(7))
                .startTime("10:00")
                .endTime("10:30")
                .maxBookings(1)
                .build();
        slot.setIsAvailable(true);
    }

    // ── createSlot ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createSlot: valid request saves slot")
    void createSlot_valid_savesSlot() {
        when(auth.getName()).thenReturn("teacher@school.com");
        when(userRepository.findByEmailIgnoreCase("teacher@school.com")).thenReturn(Optional.of(teacherUser));
        when(teacherRepository.findByUserId(1L)).thenReturn(Optional.of(teacher));
        when(slotRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<MeetingSlot> resp = meetingService.createSlot(Map.of(
            "meetingDate", LocalDate.now().plusDays(7).toString(),
            "startTime",   "10:00",
            "endTime",     "10:30"
        ), auth);

        assertTrue(resp.isSuccess());
        verify(slotRepository).save(any(MeetingSlot.class));
    }

    @Test
    @DisplayName("createSlot: missing required fields returns error")
    void createSlot_missingFields_returnsError() {
        when(auth.getName()).thenReturn("teacher@school.com");
        when(userRepository.findByEmailIgnoreCase("teacher@school.com")).thenReturn(Optional.of(teacherUser));
        when(teacherRepository.findByUserId(1L)).thenReturn(Optional.of(teacher));

        ApiResponse<MeetingSlot> resp = meetingService.createSlot(Map.of(
            "startTime", "10:00",
            "endTime",   "10:30"
            // meetingDate missing
        ), auth);

        assertFalse(resp.isSuccess());
        verify(slotRepository, never()).save(any());
    }

    @Test
    @DisplayName("createSlot: past date returns error")
    void createSlot_pastDate_returnsError() {
        when(auth.getName()).thenReturn("teacher@school.com");
        when(userRepository.findByEmailIgnoreCase("teacher@school.com")).thenReturn(Optional.of(teacherUser));
        when(teacherRepository.findByUserId(1L)).thenReturn(Optional.of(teacher));

        ApiResponse<MeetingSlot> resp = meetingService.createSlot(Map.of(
            "meetingDate", "2020-01-01",
            "startTime",   "10:00",
            "endTime",     "10:30"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("past"));
        verify(slotRepository, never()).save(any());
    }

    @Test
    @DisplayName("createSlot: teacher profile not found returns error")
    void createSlot_teacherNotFound_returnsError() {
        when(auth.getName()).thenReturn("teacher@school.com");
        when(userRepository.findByEmailIgnoreCase("teacher@school.com")).thenReturn(Optional.of(teacherUser));
        when(teacherRepository.findByUserId(1L)).thenReturn(Optional.empty());

        ApiResponse<MeetingSlot> resp = meetingService.createSlot(Map.of(
            "meetingDate", LocalDate.now().plusDays(7).toString(),
            "startTime",   "10:00",
            "endTime",     "10:30"
        ), auth);

        assertFalse(resp.isSuccess());
    }

    // ── bookSlot ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("bookSlot: valid request creates booking")
    void bookSlot_valid_createsBooking() {
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(bookingRepository.existsBySlotIdAndStudentId(1L, 20L)).thenReturn(false);
        when(bookingRepository.countBySlotIdAndStatus(1L, MeetingBooking.Status.CONFIRMED)).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(slotRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<MeetingBooking> resp = meetingService.bookSlot(1L, Map.of(), auth);

        assertTrue(resp.isSuccess());
        verify(bookingRepository).save(any(MeetingBooking.class));
    }

    @Test
    @DisplayName("bookSlot: slot not available returns error")
    void bookSlot_slotUnavailable_returnsError() {
        slot.setIsAvailable(false);
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));

        ApiResponse<MeetingBooking> resp = meetingService.bookSlot(1L, Map.of(), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("available") || resp.getMessage().toLowerCase().contains("longer"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("bookSlot: cross-school slot returns unauthorized error")
    void bookSlot_crossSchool_returnsError() {
        slot.setSchoolId(99L); // different school
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));

        ApiResponse<MeetingBooking> resp = meetingService.bookSlot(1L, Map.of(), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("unauthorized"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("bookSlot: duplicate booking returns error")
    void bookSlot_alreadyBooked_returnsError() {
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(bookingRepository.existsBySlotIdAndStudentId(1L, 20L)).thenReturn(true);

        ApiResponse<MeetingBooking> resp = meetingService.bookSlot(1L, Map.of(), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("already"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("bookSlot: sends email when parent email is set")
    void bookSlot_withParentEmail_sendsEmail() {
        student.setParentEmail("parent@gmail.com");
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(bookingRepository.existsBySlotIdAndStudentId(1L, 20L)).thenReturn(false);
        when(bookingRepository.countBySlotIdAndStatus(1L, MeetingBooking.Status.CONFIRMED)).thenReturn(0L);
        when(bookingRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(slotRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(schoolRepository.findById(5L)).thenReturn(Optional.empty());

        meetingService.bookSlot(1L, Map.of(), auth);

        verify(emailService).sendMeetingConfirmation(
            eq("parent@gmail.com"), eq("John Doe"), eq("Ms. Smith"),
            anyString(), anyString(), any(), anyString()
        );
    }

    // ── cancelBooking ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("cancelBooking: success cancels booking and re-opens slot")
    void cancelBooking_success() {
        MeetingBooking booking = MeetingBooking.builder()
                .slotId(1L).studentId(20L).status(MeetingBooking.Status.CONFIRMED).build();
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(slotRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<String> resp = meetingService.cancelBooking(99L, auth);

        assertTrue(resp.isSuccess());
        assertEquals(MeetingBooking.Status.CANCELLED, booking.getStatus());
        assertTrue(slot.getIsAvailable());
    }

    @Test
    @DisplayName("cancelBooking: wrong student returns unauthorized error")
    void cancelBooking_wrongStudent_returnsError() {
        MeetingBooking booking = MeetingBooking.builder()
                .slotId(1L).studentId(999L).status(MeetingBooking.Status.CONFIRMED).build(); // different student
        when(auth.getName()).thenReturn("student@school.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(studentUser));
        when(studentRepository.findByStudentUserId(2L)).thenReturn(Optional.of(student));
        when(bookingRepository.findById(99L)).thenReturn(Optional.of(booking));

        ApiResponse<String> resp = meetingService.cancelBooking(99L, auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("unauthorized"));
        verify(bookingRepository, never()).save(any());
    }
}
