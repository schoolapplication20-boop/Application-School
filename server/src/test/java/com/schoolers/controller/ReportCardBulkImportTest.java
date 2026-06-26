package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Marks;
import com.schoolers.model.Student;
import com.schoolers.model.User;
import com.schoolers.repository.*;
import com.schoolers.security.CurrentUserUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReportCardController – bulk CSV import")
class ReportCardBulkImportTest {

    @Mock private CurrentUserUtil       currentUserUtil;
    @Mock private UserRepository        userRepository;
    @Mock private StudentRepository     studentRepository;
    @Mock private MarksRepository       marksRepository;
    @Mock private AttendanceRepository  attendanceRepository;
    @Mock private SchoolRepository      schoolRepository;
    @Mock private com.schoolers.repository.TeacherRepository    teacherRepository;
    @Mock private com.schoolers.repository.ClassRoomRepository  classRoomRepository;
    @Mock private com.schoolers.repository.GradeScaleRepository gradeScaleRepository;
    @Mock private Authentication        auth;

    @InjectMocks private ReportCardController controller;

    private Student student;

    @BeforeEach
    void setUp() {
        student = Student.builder().id(100L).name("Alice").admissionNumber("ADM001").schoolId(1L).build();

        // bulkImportMarksCsv uses CurrentUserUtil (not userRepository) to resolve schoolId/userId
        when(currentUserUtil.getCurrentSchoolId(auth)).thenReturn(1L);
        when(currentUserUtil.getCurrentUserId(auth)).thenReturn(10L);
        // auth.getAuthorities() is called to determine role; empty = not a teacher → skip class-teacher check
        when(auth.getAuthorities()).thenReturn(java.util.Collections.emptyList());
        // gradeScaleRepository empty → controller falls back to DEFAULT_GRADE_SCALE
        when(gradeScaleRepository.findBySchoolIdOrderByMinPercentageDesc(anyLong())).thenReturn(List.of());
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test @DisplayName("saves valid rows and returns saved count")
    void savesValidRows() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001")).thenReturn(List.of(student));
        when(marksRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = Map.of(
            "examType", "Unit Test 1",
            "examDate", "2026-01-15",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Math", "marks", "85", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        assertThat(resp.getStatusCode().value()).isEqualTo(200);

        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();
        assertThat(apiResp.isSuccess()).isTrue();
        assertThat(apiResp.getData().get("saved")).isEqualTo(1);
        assertThat(apiResp.getData().get("total")).isEqualTo(1);
    }

    @Test @DisplayName("assigns correct grade based on percentage")
    void assignsCorrectGrade() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001")).thenReturn(List.of(student));
        when(marksRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = Map.of(
            "examType", "Final",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Science", "marks", "91", "maxMarks", "100")
            )
        );
        controller.bulkImportMarksCsv(body, auth);

        verify(marksRepository).save(argThat(m -> "O".equals(m.getGrade())));
    }

    // ── Validation ────────────────────────────────────────────────────────────

    @Test @DisplayName("marks exceeding maxMarks returns per-row error")
    void marksExceedingMax() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001")).thenReturn(List.of(student));

        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Math", "marks", "110", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();

        // Should NOT save — marks > maxMarks
        verify(marksRepository, never()).save(any());
        assertThat(apiResp.getData().get("saved")).isEqualTo(0);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) apiResp.getData().get("results");
        assertThat(results.get(0).get("status")).isEqualTo("error");
    }

    @Test @DisplayName("unknown admission number returns per-row error")
    void unknownAdmissionNumber() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("UNKNOWN")).thenReturn(List.of());

        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "UNKNOWN", "subject", "Math", "marks", "80", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();

        verify(marksRepository, never()).save(any());
        assertThat(apiResp.getData().get("saved")).isEqualTo(0);
    }

    @Test @DisplayName("student from different school is not matched")
    void studentFromDifferentSchool() {
        Student otherSchoolStudent = Student.builder()
                .id(200L).name("Bob").admissionNumber("ADM001").schoolId(999L).build();
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001"))
                .thenReturn(List.of(otherSchoolStudent)); // different school

        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Math", "marks", "80", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();

        verify(marksRepository, never()).save(any());
        assertThat(apiResp.getData().get("saved")).isEqualTo(0);
    }

    @Test @DisplayName("missing required fields returns per-row error without crash")
    void missingFields() {
        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "", "subject", "Math", "marks", "80", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();
        assertThat(apiResp.getData().get("saved")).isEqualTo(0);
    }

    @Test @DisplayName("non-numeric marks returns per-row error")
    void nonNumericMarks() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001")).thenReturn(List.of(student));

        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Math", "marks", "abc", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();
        verify(marksRepository, never()).save(any());
        assertThat(apiResp.getData().get("saved")).isEqualTo(0);
    }

    @Test @DisplayName("empty rows list returns 400")
    void emptyRows() {
        Map<String, Object> body = Map.of("examType", "Test", "rows", List.of());
        var resp = controller.bulkImportMarksCsv(body, auth);
        assertThat(resp.getStatusCode().value()).isEqualTo(400);
    }

    // ── Mixed valid + invalid rows ─────────────────────────────────────────────

    @Test @DisplayName("saves valid rows and marks invalid rows as error")
    void mixedRows() {
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("ADM001")).thenReturn(List.of(student));
        when(studentRepository.findAllByAdmissionNumberIgnoreCase("BAD")).thenReturn(List.of());
        when(marksRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = Map.of(
            "examType", "Test",
            "rows", List.of(
                Map.of("admissionNumber", "ADM001", "subject", "Math",  "marks", "80", "maxMarks", "100"),
                Map.of("admissionNumber", "BAD",    "subject", "Math",  "marks", "90", "maxMarks", "100")
            )
        );

        var resp = controller.bulkImportMarksCsv(body, auth);
        @SuppressWarnings("unchecked")
        ApiResponse<Map<String, Object>> apiResp = (ApiResponse<Map<String, Object>>) resp.getBody();

        assertThat(apiResp.getData().get("saved")).isEqualTo(1);
        assertThat(apiResp.getData().get("total")).isEqualTo(2);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> results = (List<Map<String, Object>>) apiResp.getData().get("results");
        assertThat(results.get(0).get("status")).isEqualTo("ok");
        assertThat(results.get(1).get("status")).isEqualTo("error");
    }
}
