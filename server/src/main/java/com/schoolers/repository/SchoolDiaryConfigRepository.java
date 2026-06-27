package com.schoolers.repository;

import com.schoolers.model.SchoolDiaryConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Repository
public interface SchoolDiaryConfigRepository extends JpaRepository<SchoolDiaryConfig, Long> {
    Optional<SchoolDiaryConfig> findBySchoolId(Long schoolId);

    /**
     * Atomic upsert — INSERT if no row exists, UPDATE in-place if it does.
     * This bypasses Spring Data's save() → isNew() → merge/persist ambiguity that
     * causes a duplicate-key exception when the @Id is manually assigned (no @GeneratedValue).
     */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO school_diary_config
            (school_id, diary_mode, coordinator_user_id, requires_approval,
             notify_students_push, notify_parents_whatsapp, created_at, updated_at)
        VALUES
            (:schoolId, :diaryMode, :coordinatorUserId, :requiresApproval,
             :notifyStudentsPush, :notifyParentsWhatsapp, NOW(), NOW())
        ON CONFLICT (school_id) DO UPDATE SET
            diary_mode              = EXCLUDED.diary_mode,
            coordinator_user_id     = EXCLUDED.coordinator_user_id,
            requires_approval       = EXCLUDED.requires_approval,
            notify_students_push    = EXCLUDED.notify_students_push,
            notify_parents_whatsapp = EXCLUDED.notify_parents_whatsapp,
            updated_at              = NOW()
        """, nativeQuery = true)
    void upsert(@Param("schoolId")              Long    schoolId,
                @Param("diaryMode")             String  diaryMode,
                @Param("coordinatorUserId")     Long    coordinatorUserId,
                @Param("requiresApproval")      boolean requiresApproval,
                @Param("notifyStudentsPush")    boolean notifyStudentsPush,
                @Param("notifyParentsWhatsapp") boolean notifyParentsWhatsapp);
}
