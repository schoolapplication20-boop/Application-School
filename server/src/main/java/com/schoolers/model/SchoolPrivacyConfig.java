package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "school_privacy_config")
@Data
public class SchoolPrivacyConfig {

    @Id
    @Column(name = "school_id")
    private Long schoolId;

    /**
     * When true, teachers can only see student name / class / roll number.
     * Phone numbers, parent email, and fee details are visible only to
     * ADMIN and SUPER_ADMIN.
     */
    @Column(name = "hide_student_contact_info", nullable = false)
    private Boolean hideStudentContactInfo = false;

    /**
     * @deprecated Used to block the ENTIRE student "My Fees" page (total fee, paid amount,
     * due amount, installments, payment history), even though its stated intent was only to
     * hide the concession amount. No longer read — see {@link #showFeeDetailsToStudents},
     * {@link #hideConcessionFromStudents}, and {@link #concessionSuperAdminOnly}.
     */
    @Deprecated
    @Column(name = "hide_fee_info_from_students", nullable = false)
    private Boolean hideFeeInfoFromStudents = false;

    /** When false, the student "My Fees" page is blocked entirely (rare — most schools want this on). */
    @Column(name = "show_fee_details_to_students", nullable = false)
    private Boolean showFeeDetailsToStudents = true;

    /** When true, the concession/condonation amount is never included in the student's own fee data. */
    @Column(name = "hide_concession_from_students", nullable = false)
    private Boolean hideConcessionFromStudents = true;

    /** When true, only SUPER_ADMIN sees the concession/condonation amount in admin-facing fee views/exports — plain ADMIN does not. */
    @Column(name = "concession_super_admin_only", nullable = false)
    private Boolean concessionSuperAdminOnly = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    public void touch() { updatedAt = LocalDateTime.now(); }
}
