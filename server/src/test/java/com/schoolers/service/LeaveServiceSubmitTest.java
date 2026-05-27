package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LeaveService — submitStudentLeave")
class LeaveServiceSubmitTest {

    @InjectMocks private LeaveService leaveService;

    @Mock private LeaveRequestRepository    leaveRepository;
    @Mock private AppNotificationService    notificationService;
    @Mock private UserRepository            userRepository;
    @Mock private StudentRepository         studentRepository;
    @Mock private TeacherRepository         teacherRepository;
    @Mock private ClassRoomRepository       classRoomRepository;
    @Mock private EmailService              emailService;

    @Mock private Authentication auth;

    private User    mockUser;
    private Student mockStudent;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(leaveService, "appBaseUrl", "https://my-skoolz.vercel.app");

        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("student@school.com");
        mockUser.setSchoolId(5L);

        mockStudent = new Student();
        mockStudent.setId(10L);
        mockStudent.setName("John Doe");
        mockStudent.setClassName("10");
        mockStudent.setSection("A");
        mockStudent.setSchoolId(5L);

        when(auth.getName()).thenReturn("student@school.com");
    }

    // ── success ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("valid request saves leave with a non-null parent token")
    void submit_validRequest_savesLeaveWithParentToken() {
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(1L)).thenReturn(Optional.of(mockStudent));
        when(classRoomRepository.findBySchoolId(5L)).thenReturn(List.of());

        ArgumentCaptor<LeaveRequest> captor = ArgumentCaptor.forClass(LeaveRequest.class);
        when(leaveRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> body = Map.of(
            "fromDate", "2026-06-01",
            "toDate",   "2026-06-03",
            "reason",   "Medical appointment"
        );

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(body, auth);

        assertTrue(resp.isSuccess());
        assertNotNull(captor.getValue().getParentToken());
        assertEquals(32, captor.getValue().getParentToken().length()); // UUID without hyphens
    }

    @Test
    @DisplayName("valid request with parent email sends acknowledgement email")
    void submit_withParentEmail_sendsAckEmail() {
        mockStudent.setParentEmail("parent@gmail.com");
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(1L)).thenReturn(Optional.of(mockStudent));
        when(classRoomRepository.findBySchoolId(5L)).thenReturn(List.of());
        when(leaveRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01",
            "toDate",   "2026-06-03",
            "reason",   "Sick"
        ), auth);

        verify(emailService).sendParentLeaveAcknowledgement(
            eq("parent@gmail.com"), eq("John Doe"),
            eq("2026-06-01"), eq("2026-06-03"),
            anyString(), anyString(), anyString()
        );
    }

    @Test
    @DisplayName("valid request without parent email skips email")
    void submit_noParentEmail_skipsEmail() {
        mockStudent.setParentEmail(null);
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(1L)).thenReturn(Optional.of(mockStudent));
        when(classRoomRepository.findBySchoolId(5L)).thenReturn(List.of());
        when(leaveRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01",
            "toDate",   "2026-06-03",
            "reason",   "Sick"
        ), auth);

        verify(emailService, never()).sendParentLeaveAcknowledgement(any(), any(), any(), any(), any(), any(), any());
    }

    // ── auth failures ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("user not found in DB returns error")
    void submit_userNotFound_returnsError() {
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.empty());

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01", "toDate", "2026-06-03", "reason", "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("user"));
    }

    @Test
    @DisplayName("student profile not found returns error")
    void submit_studentNotFound_returnsError() {
        when(userRepository.findByEmailIgnoreCase("student@school.com")).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(1L)).thenReturn(Optional.empty());

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01", "toDate", "2026-06-03", "reason", "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("student"));
    }

    // ── field validation ───────────────────────────────────────────────────────

    @Test
    @DisplayName("missing fromDate returns validation error")
    void submit_missingFromDate_returnsError() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "toDate", "2026-06-03", "reason", "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("from date") ||
                   resp.getMessage().toLowerCase().contains("fromdate"));
    }

    @Test
    @DisplayName("missing toDate returns validation error")
    void submit_missingToDate_returnsError() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01", "reason", "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("to date") ||
                   resp.getMessage().toLowerCase().contains("todate"));
    }

    @Test
    @DisplayName("missing reason returns validation error")
    void submit_missingReason_returnsError() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01", "toDate", "2026-06-03"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("reason"));
    }

    @Test
    @DisplayName("toDate before fromDate returns error")
    void submit_toDateBeforeFromDate_returnsError() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-10",
            "toDate",   "2026-06-01", // before fromDate
            "reason",   "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("before") ||
                   resp.getMessage().toLowerCase().contains("to date"));
    }

    @Test
    @DisplayName("invalid date format returns parse error")
    void submit_invalidDateFormat_returnsError() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));

        ApiResponse<LeaveRequest> resp = leaveService.submitStudentLeave(Map.of(
            "fromDate", "not-a-date",
            "toDate",   "2026-06-03",
            "reason",   "Sick"
        ), auth);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("date") ||
                   resp.getMessage().toLowerCase().contains("format"));
    }

    // ── leave type defaulting ──────────────────────────────────────────────────

    @Test
    @DisplayName("leave type defaults to 'Other' when not provided")
    void submit_noLeaveType_defaultsToOther() {
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.of(mockUser));
        when(studentRepository.findByStudentUserId(anyLong())).thenReturn(Optional.of(mockStudent));
        when(classRoomRepository.findBySchoolId(5L)).thenReturn(List.of());

        ArgumentCaptor<LeaveRequest> captor = ArgumentCaptor.forClass(LeaveRequest.class);
        when(leaveRepository.save(captor.capture())).thenAnswer(i -> i.getArgument(0));

        leaveService.submitStudentLeave(Map.of(
            "fromDate", "2026-06-01", "toDate", "2026-06-03", "reason", "Sick"
        ), auth);

        assertEquals("Other", captor.getValue().getLeaveType());
    }
}
