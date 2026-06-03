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
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OwnerController – pricing, billing, payment plan")
class OwnerControllerTest {

    @Mock private SchoolRepository              schoolRepository;
    @Mock private UserRepository                userRepository;
    @Mock private StudentFeeAssignmentRepository feeAssignmentRepository;
    @Mock private EmailService                  emailService;
    @Mock private Authentication                auth;

    @InjectMocks private OwnerController controller;

    private School school;

    @BeforeEach
    void setUp() {
        school = School.builder()
                .id(1L).schoolId(1).name("Test School")
                .pricePerUser(null).paymentPlan("YEARLY").build();
        when(auth.getName()).thenReturn("owner@platform.com");
        when(userRepository.findByEmailIgnoreCase("owner@platform.com"))
                .thenReturn(Optional.of(User.builder().id(1L).email("owner@platform.com").build()));
    }

    // ── setPricePerUser ───────────────────────────────────────────────────────

    @Nested @DisplayName("setPricePerUser")
    class SetPricePerUser {

        @Test @DisplayName("sets valid price")
        void setsValidPrice() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setPricePerUser(1L, Map.of("pricePerUser", "50"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> new BigDecimal("50").compareTo(s.getPricePerUser()) == 0));
        }

        @Test @DisplayName("clears price when null sent")
        void clearsPriceWhenNull() {
            school = School.builder().id(1L).schoolId(1).pricePerUser(new BigDecimal("50")).build();
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setPricePerUser(1L, Map.of(), auth); // body has no pricePerUser
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> s.getPricePerUser() == null));
        }

        @Test @DisplayName("rejects negative price")
        void rejectsNegative() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPricePerUser(1L, Map.of("pricePerUser", "-10"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
            verify(schoolRepository, never()).save(any());
        }

        @Test @DisplayName("rejects non-numeric value")
        void rejectsNonNumeric() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPricePerUser(1L, Map.of("pricePerUser", "abc"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }

        @Test @DisplayName("returns 404 for unknown school")
        void notFound() {
            when(schoolRepository.findById(99L)).thenReturn(Optional.empty());
            var resp = controller.setPricePerUser(99L, Map.of("pricePerUser", "50"), auth);
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

            var resp = controller.setPaymentPlan(1L, Map.of("paymentPlan", "QUARTERLY"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> "QUARTERLY".equals(s.getPaymentPlan())));
        }

        @Test @DisplayName("accepts all valid plans")
        void acceptsAllValidPlans() {
            for (String plan : new String[]{"MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"}) {
                when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
                when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
                var resp = controller.setPaymentPlan(1L, Map.of("paymentPlan", plan), auth);
                assertThat(resp.getStatusCode().value()).isEqualTo(200);
            }
        }

        @Test @DisplayName("rejects unknown plan")
        void rejectsUnknown() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPaymentPlan(1L, Map.of("paymentPlan", "WEEKLY"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }

        @Test @DisplayName("rejects null plan")
        void rejectsNull() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setPaymentPlan(1L, Map.of(), auth);
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

            var resp = controller.setUserLimit(1L, Map.of("userLimit", "500"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> Integer.valueOf(500).equals(s.getUserLimit())));
        }

        @Test @DisplayName("removes limit when null body sent")
        void removesLimit() {
            school = School.builder().id(1L).userLimit(500).build();
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            when(schoolRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            var resp = controller.setUserLimit(1L, Map.of(), auth); // no userLimit key
            assertThat(resp.getStatusCode().value()).isEqualTo(200);
            verify(schoolRepository).save(argThat(s -> s.getUserLimit() == null));
        }

        @Test @DisplayName("rejects limit less than 1")
        void rejectsZero() {
            when(schoolRepository.findById(1L)).thenReturn(Optional.of(school));
            var resp = controller.setUserLimit(1L, Map.of("userLimit", "0"), auth);
            assertThat(resp.getStatusCode().value()).isEqualTo(400);
        }
    }
}
