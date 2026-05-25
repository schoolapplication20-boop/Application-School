package com.schoolers.repository;

import com.schoolers.model.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {
    Optional<School> findByCode(String code);
    Optional<School> findByEmail(String email);
    boolean existsByCode(String code);
    boolean existsByEmail(String email);
    boolean existsBySchoolId(Integer schoolId);
    /** True if any OTHER school (id != excludeId) already has this schoolId. */
    boolean existsBySchoolIdAndIdNot(Integer schoolId, Long excludeId);
    /** Look up a school by its human-assigned display number (the value shown in the UI). */
    Optional<School> findBySchoolId(Integer schoolId);
    /** Find schools whose subscription expires on a specific date (used for expiry alerts). */
    List<School> findBySubscriptionExpiry(LocalDate date);
}
