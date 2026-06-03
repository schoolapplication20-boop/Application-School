package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.*;
import com.schoolers.service.AuthService;
import com.schoolers.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for OwnerController endpoints: setPricePerUser, setPaymentPlan, setUserLimit.
 * Methods do NOT take Authentication — they resolve it internally; tests call them directly.
 * Map bodies must be Map<String,Object> to match the @RequestBody parameter type.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OwnerController – pricing, billing, payment plan")
class OwnerControllerTest {

    @Mock private SchoolRepository               schoolRepository;
    @Mock private UserRepository                 userRepository;
    @Mock private StudentFeeAssignmentRepository feeAssignmentRepository;
    @Mock private EmailService                   emailService;
    @Mock private Authentication                 auth; // kept for OTP methods that do use it

    @InjectMocks private OwnerController controller;

    private School school;

    /** Build a Map<String,Object> — Map.of() without type witness gives Map<String,String>. */
    private static Map<String, Object> body(Object... kvPairs) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < kvPairs.length - 1; i += 2) {
            m.put((String) kvPairs[i], kvPairs[i + 1]);
        }
        return m;
    }

    @BeforeEach
    void setUp() {
        school = School.builder()
                .id(1L).schoolId(1).name("Test School")
                .pricePerUser(null).paymentPlan("YEARLY").build();
    }

    // ── setPricePerUser ───────────────────────────────────────────────────────

    @Nested @DisplayName("setPricePerUser")
    class SetPricePerUser {

        @Test @DisplayName("sets valid price")
        void setsValidPrice() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setPricePerUser(1L, body("pricePerUser", "50"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> new BigDecimal("50").compareTo(s.getPricePerUser()) == 0));
        }

        @Test @DisplayName("clears price when body has no pricePerUser key")
        void clearsPriceWhenAbsent() {
            school = School.builder().id(1L).schoolId(1).pricePerUser(new BigDecimal("50")).build();
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setPricePerUser(1L, body(), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> s.getPricePerUser() == null));
        }

        @Test @DisplayName("rejects negative price")
        void rejectsNegative() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPricePerUser(1L, body("pricePerUser", "-10"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
            verify(schoolRepository, never()).save(any());
        }

        @Test @DisplayName("rejects non-numeric value")
        void rejectsNonNumeric() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPricePerUser(1L, body("pricePerUser", "abc"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }

        @Test @DisplayName("returns 404 for unknown school")
        void notFound() {
            when(schoolRepository.findById(99L)).thenReturn(Optional.empty());
            var resp = controller.setPricePerUser(99L, body("pricePerUser", "50"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(404);
        }
    }

    // ── setPaymentPlan ────────────────────────────────────────────────────────

    @Nested @DisplayName("setPaymentPlan")
    class SetPaymentPlan {

        @Test @DisplayName("accepts QUARTERLY")
        void acceptsQuarterly() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setPaymentPlan(1L, body("paymentPlan", "QUARTERLY"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> "QUARTERLY".equals(s.getPaymentPlan())));
        }

        @Test @DisplayName("accepts all four valid plans")
        void acceptsAllValidPlans() {
            for (String plan : new String[]{"MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"}) {
                when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
                when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
                var resp = controller.setPaymentPlan(1L, body("paymentPlan", plan), auth);
                assertThat(resp.getStatusCode().value()).isEqualTo(200);
            }
        }

        @Test @DisplayName("rejects unknown plan")
        void rejectsUnknown() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPaymentPlan(1L, body("paymentPlan", "WEEKLY"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }

        @Test @DisplayName("rejects null / absent plan")
        void rejectsNull() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPaymentPlan(1L, body(), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }
    }

    // ── setUserLimit ──────────────────────────────────────────────────────────

    @Nested @DisplayName("setUserLimit")
    class SetUserLimit {

        @Test @DisplayName("sets valid limit")
        void setsValidLimit() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setUserLimit(1L, body("userLimit", "500"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> Integer.valueOf(500).equals(s.getUserLimit())));
        }

        @Test @DisplayName("removes limit when body has no userLimit key")
        void removesLimit() {
            school = School.builder().id(1L).userLimit(500).build();
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setUserLimit(1L, body(), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> s.getUserLimit() == null));
        }

        @Test @DisplayName("rejects zero limit")
        void rejectsZero() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setUserLimit(1L, body("userLimit", "0"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }
    }
}
