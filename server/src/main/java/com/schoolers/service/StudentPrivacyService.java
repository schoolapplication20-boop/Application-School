package com.schoolers.service;

import com.schoolers.model.Student;
import com.schoolers.repository.SchoolPrivacyConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentPrivacyService {

    @Autowired
    private SchoolPrivacyConfigRepository privacyConfigRepository;

    /**
     * Returns true when the school's privacy config says to hide student
     * contact info AND the caller is not an admin-level role.
     *
     * @param schoolId   the school to check
     * @param callerRole the Spring Security role name WITHOUT the ROLE_ prefix
     *                   (e.g. "TEACHER", "ADMIN", "SUPER_ADMIN")
     */
    public boolean shouldHideContactInfo(Long schoolId, String callerRole) {
        if ("ADMIN".equals(callerRole) || "SUPER_ADMIN".equals(callerRole)
                || "APPLICATION_OWNER".equals(callerRole)) {
            return false; // admins always see everything
        }
        return privacyConfigRepository.findBySchoolId(schoolId)
                .map(cfg -> Boolean.TRUE.equals(cfg.getHideStudentContactInfo()))
                .orElse(false);
    }

    /**
     * Whether the student "My Fees" page (total fee, paid, due, installments, payment
     * history) should be shown at all. Defaults to true — most schools want students to
     * see their own fee status; this only blocks the page for schools that explicitly opt out.
     */
    public boolean shouldShowFeeDetailsToStudents(Long schoolId) {
        return privacyConfigRepository.findBySchoolId(schoolId)
                .map(cfg -> !Boolean.FALSE.equals(cfg.getShowFeeDetailsToStudents()))
                .orElse(true);
    }

    /**
     * Whether the concession/condonation amount should be hidden from the student's own
     * fee data (also covers parents, who view fees via the student login). Defaults to true.
     */
    public boolean shouldHideConcessionFromStudents(Long schoolId) {
        return privacyConfigRepository.findBySchoolId(schoolId)
                .map(cfg -> !Boolean.FALSE.equals(cfg.getHideConcessionFromStudents()))
                .orElse(true);
    }

    /**
     * Whether the concession/condonation amount is restricted to SUPER_ADMIN in admin-facing
     * fee views (student fee list, collect fee, Excel exports) — i.e. plain ADMIN does not see
     * it. Defaults to true.
     */
    public boolean isConcessionSuperAdminOnly(Long schoolId) {
        return privacyConfigRepository.findBySchoolId(schoolId)
                .map(cfg -> !Boolean.FALSE.equals(cfg.getConcessionSuperAdminOnly()))
                .orElse(true);
    }

    /** Whether concessionAmount may be included in an admin-facing response for this caller. */
    public boolean canAdminViewConcession(Long schoolId, boolean isSuperAdmin) {
        return isSuperAdmin || !isConcessionSuperAdminOnly(schoolId);
    }

    /** Nulls out sensitive contact fields on a single student (call after JPA transaction, i.e. detached entity). */
    public void maskContactInfo(Student s) {
        s.setParentMobile(null);
        s.setMotherMobile(null);
        s.setGuardianMobile(null);
        s.setParentEmail(null);
    }

    public void maskContactInfo(List<Student> students) {
        if (students != null) students.forEach(this::maskContactInfo);
    }
}
