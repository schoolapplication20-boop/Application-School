package com.schoolers.repository;

import com.schoolers.model.SchoolPrivacyConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SchoolPrivacyConfigRepository extends JpaRepository<SchoolPrivacyConfig, Long> {
    Optional<SchoolPrivacyConfig> findBySchoolId(Long schoolId);
}
