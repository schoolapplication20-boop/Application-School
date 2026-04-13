package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "schools")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Basic Info ──────────────────────────────────────────────────────────
    @Column(nullable = false, length = 200)
    private String name;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    @Column(length = 50)
    private String board; // CBSE, ICSE, State Board, Other

    @Column(name = "academic_year", length = 20)
    private String academicYear; // e.g. "2024-2025"

    // ── Address ─────────────────────────────────────────────────────────────
    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String pincode;

    @Column(length = 100)
    @Builder.Default
    private String country = "India";

    // ── Contact ─────────────────────────────────────────────────────────────
    @Column(length = 20)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(length = 300)
    private String website;

    // ── Branding ────────────────────────────────────────────────────────────
    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "primary_color", length = 20)
    @Builder.Default
    private String primaryColor = "#76C442";

    @Column(name = "secondary_color", length = 20)
    @Builder.Default
    private String secondaryColor = "#5fa832";

    // ── Academic Config ──────────────────────────────────────────────────────
    @Column(name = "total_classes")
    private Integer totalClasses;

    @Column(length = 200)
    private String sections; // comma-separated e.g. "A,B,C,D"

    // ── Subscription ─────────────────────────────────────────────────────────
    @Column(name = "subscription_plan", length = 30)
    @Builder.Default
    private String subscriptionPlan = "BASIC"; // BASIC, STANDARD, PREMIUM

    @Column(name = "subscription_expiry")
    private LocalDate subscriptionExpiry;

    // ── Feature Toggles (stored as JSON string) ──────────────────────────────
    @Column(name = "features", columnDefinition = "TEXT")
    @Builder.Default
    private String features = "{\"attendance\":true,\"transport\":true,\"fees\":true,"
            + "\"salary\":true,\"examination\":true,\"diary\":true,"
            + "\"announcements\":true,\"messages\":true}";

    // ── Setup Status ──────────────────────────────────────────────────────────
    /**
     * Set to true after the Super Admin completes the Setup School wizard.
     * While false, the Super Admin is redirected to the wizard on every login.
     * Once true it is never automatically reset (requires manual DB/admin action).
     */
    @Column(name = "is_setup_completed")
    @Builder.Default
    private Boolean isSetupCompleted = false;

    // ── Status ───────────────────────────────────────────────────────────────
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
