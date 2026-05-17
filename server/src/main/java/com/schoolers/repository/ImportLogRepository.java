package com.schoolers.repository;

import com.schoolers.model.ImportLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, Long> {
    List<ImportLog> findBySchoolIdOrderByImportedAtDesc(Long schoolId);
    List<ImportLog> findTop10BySchoolIdOrderByImportedAtDesc(Long schoolId);
}
