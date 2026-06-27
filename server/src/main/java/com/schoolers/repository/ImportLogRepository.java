package com.schoolers.repository;

import com.schoolers.model.ImportLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, Long> {
    List<ImportLog> findBySchoolIdOrderByImportedAtDesc(Long schoolId);
    List<ImportLog> findTop10BySchoolIdOrderByImportedAtDesc(Long schoolId);

    @Modifying @Transactional
    void deleteBySchoolId(Long schoolId);

    /** Called every BATCH_SIZE rows by the async worker to push live progress. */
    @Modifying @Transactional
    @Query("UPDATE ImportLog l SET l.processedRows = :processed, l.importedRows = :imported, " +
           "l.failedRows = :failed, l.duplicateRows = :dupes WHERE l.id = :id")
    void updateProgress(@Param("id") Long id,
                        @Param("processed") int processed,
                        @Param("imported") int imported,
                        @Param("failed") int failed,
                        @Param("dupes") int dupes);

    /** Called once when the async worker finishes — writes all final counters + credentials JSON. */
    @Modifying @Transactional
    @Query("UPDATE ImportLog l SET l.totalRows = :total, l.importedRows = :imported, " +
           "l.failedRows = :failed, l.duplicateRows = :dupes, l.processedRows = :total, " +
           "l.failedRowsJson = :failedJson, l.credentialsJson = :credJson, l.status = :status " +
           "WHERE l.id = :id")
    void updateFinal(@Param("id") Long id,
                     @Param("total") int total,
                     @Param("imported") int imported,
                     @Param("failed") int failed,
                     @Param("dupes") int dupes,
                     @Param("failedJson") String failedJson,
                     @Param("credJson") String credJson,
                     @Param("status") String status);

    @Modifying @Transactional
    @Query("UPDATE ImportLog l SET l.status = :status WHERE l.id = :id")
    void updateStatus(@Param("id") Long id, @Param("status") String status);
}
