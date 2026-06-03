package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ClassFeeStructure;
import com.schoolers.model.School;
import com.schoolers.repository.ClassFeeStructureRepository;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AdminService – yearRollover and checkUserLimit")
class AdminServiceYearRolloverTest {

    @Mock private SchoolRepository             schoolRepository;
    @Mock private ClassFeeStructureRepository  classFeeStructureRepository;
    @Mock private UserRepository               userRepository;

    @InjectMocks private AdminService adminService;

    private School school;

    @BeforeEach
    void setUp() {
        school = School.builder()
                .id(1L).schoolId(1).name("Test School")
                .academicYear("2025-26")
                .build();
    }

    // ── Format validation ─────────────────────────────────────────────────────

    @Nested @DisplayName("Format validation")
    class FormatValidation {

        @Test @DisplayName("rejects null academicYear")
        void rejectsNull() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            ApiResponse<?> res = adminService.yearRollover(1L, null, false);
            assertThat(res.isSuccess()).isFalse();
            assertThat(res.getMessage()).containsIgnoringCase("format");
        }

        @Test @DisplayName("rejects plain text")
        void rejectsPlainText() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            ApiResponse<?> res = adminService.yearRollover(1L, "next year", false);
            assertThat(res.isSuccess()).isFalse();
        }

        @Test @DisplayName("rejects 4-digit-only year")
        void rejects4DigitOnly() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            ApiResponse<?> res = adminService.yearRollover(1L, "2026", false);
            assertThat(res.isSuccess()).isFalse();
        }

        @Test @DisplayName("accepts YYYY-YY format")
        void acceptsShortFormat() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenReturn(school);
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of());
            ApiResponse<?> res = adminService.yearRollover(1L, "2026-27", false);
            assertThat(res.isSuccess()).isTrue();
        }

        @Test @DisplayName("accepts YYYY-YYYY format")
        void acceptsLongFormat() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenReturn(school);
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of());
            ApiResponse<?> res = adminService.yearRollover(1L, "2026-2027", false);
            assertThat(res.isSuccess()).isTrue();
        }
    }

    // ── Same-year rejection ───────────────────────────────────────────────────

    @Nested @DisplayName("Same-year rejection")
    class SameYear {

        @Test @DisplayName("rejects when new year equals current year")
        void rejectsSameYear() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            ApiResponse<?> res = adminService.yearRollover(1L, "2025-26", false);
            assertThat(res.isSuccess()).isFalse();
            assertThat(res.getMessage()).containsIgnoringCase("differ");
        }
    }

    // ── Success path ──────────────────────────────────────────────────────────

    @Nested @DisplayName("Success path")
    class SuccessPath {

        @Test @DisplayName("updates school academicYear")
        void updatesAcademicYear() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of());

            adminService.yearRollover(1L, "2026-27", false);

            verify(schoolRepository).save(argThat(s -> "2026-27".equals(s.getAcademicYear())));
        }

        @Test @DisplayName("returns previousYear and newYear in result")
        void returnsYears() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenReturn(school);
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of());

            @SuppressWarnings("unchecked")
            ApiResponse<Map<String, Object>> res =
                    (ApiResponse<Map<String, Object>>) (ApiResponse<?>) adminService.yearRollover(1L, "2026-27", false);

            assertThat(res.isSuccess()).isTrue();
            assertThat(res.getData()).containsEntry("previousYear", "2025-26");
            assertThat(res.getData()).containsEntry("newYear", "2026-27");
        }

        @Test @DisplayName("copies fee structures when flag is true")
        void copiesFeeStructures() {
            ClassFeeStructure existing = ClassFeeStructure.builder()
                    .id(1L).className("Class 10").academicYear("2025-26")
                    .schoolId(1L).tuitionFee(new BigDecimal("5000"))
                    .transportFee(BigDecimal.ZERO).labFee(BigDecimal.ZERO)
                    .examFee(BigDecimal.ZERO).sportsFee(BigDecimal.ZERO)
                    .otherFee(BigDecimal.ZERO).build();

            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenReturn(school);
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of(existing));
            when(classFeeStructureRepository.findByClassNameAndAcademicYearAndSchoolId(any(), eq("2026-27"), any()))
                    .thenReturn(Optional.empty()); // doesn't exist yet
            when(classFeeStructureRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            @SuppressWarnings("unchecked")
            ApiResponse<Map<String, Object>> res =
                    (ApiResponse<Map<String, Object>>) (ApiResponse<?>) adminService.yearRollover(1L, "2026-27", true);

            assertThat(res.isSuccess()).isTrue();
            assertThat(res.getData().get("feeStructuresCopied")).isEqualTo(1);
            verify(classFeeStructureRepository).save(argThat(cfs ->
                    "2026-27".equals(cfs.getAcademicYear()) &&
                    "Class 10".equals(cfs.getClassName()) &&
                    new BigDecimal("5000").compareTo(cfs.getTuitionFee()) == 0));
        }

        @Test @DisplayName("skips copy if fee structure already exists for new year")
        void skipsExistingFeeStructure() {
            ClassFeeStructure existing = ClassFeeStructure.builder()
                    .id(1L).className("Class 10").academicYear("2025-26").schoolId(1L)
                    .tuitionFee(new BigDecimal("5000")).transportFee(BigDecimal.ZERO)
                    .labFee(BigDecimal.ZERO).examFee(BigDecimal.ZERO)
                    .sportsFee(BigDecimal.ZERO).otherFee(BigDecimal.ZERO).build();

            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenReturn(school);
            when(classFeeStructureRepository.findBySchoolId(1L)).thenReturn(List.of(existing));
            when(classFeeStructureRepository.findByClassNameAndAcademicYearAndSchoolId(any(), eq("2026-27"), any()))
                    .thenReturn(Optional.of(existing)); // already exists

            @SuppressWarnings("unchecked")
            ApiResponse<Map<String, Object>> res =
                    (ApiResponse<Map<String, Object>>) (ApiResponse<?>) adminService.yearRollover(1L, "2026-27", true);

            assertThat(res.isSuccess()).isTrue();
            assertThat(res.getData().get("feeStructuresCopied")).isEqualTo(0);
            verify(classFeeStructureRepository, never()).save(any());
        }
    }

    // ── School not found ──────────────────────────────────────────────────────

    @Test @DisplayName("returns error when schoolId is null")
    void nullSchoolId() {
        ApiResponse<?> res = adminService.yearRollover(null, "2026-27", false);
        assertThat(res.isSuccess()).isFalse();
    }

    @Test @DisplayName("returns error when school not found in DB")
    void schoolNotFound() {
        when(schoolRepository.findById(99L)).thenReturn(Optional.empty());
        when(schoolRepository.findBySchoolId(99)).thenReturn(Optional.empty());
        ApiResponse<?> res = adminService.yearRollover(99L, "2026-27", false);
        assertThat(res.isSuccess()).isFalse();
    }
}
