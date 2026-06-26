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
