package com.schoolers.repository;

import com.schoolers.model.SchoolAuthConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SchoolAuthConfigRepository extends JpaRepository<SchoolAuthConfig, Long> {
    Optional<SchoolAuthConfig> findBySchoolId(Long schoolId);
}
