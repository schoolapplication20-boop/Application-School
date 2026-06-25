package com.schoolers.repository;

import com.schoolers.model.SchoolDiaryConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SchoolDiaryConfigRepository extends JpaRepository<SchoolDiaryConfig, Long> {
    Optional<SchoolDiaryConfig> findBySchoolId(Long schoolId);
}
