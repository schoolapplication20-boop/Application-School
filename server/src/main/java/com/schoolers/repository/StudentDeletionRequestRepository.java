package com.schoolers.repository;

import com.schoolers.model.StudentDeletionRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentDeletionRequestRepository extends JpaRepository<StudentDeletionRequest, Long> {

    List<StudentDeletionRequest> findBySchoolIdOrderByRequestedAtDesc(Long schoolId);

    List<StudentDeletionRequest> findByRequestedByUserIdOrderByRequestedAtDesc(Long requestedByUserId);

    long countBySchoolIdAndStatus(Long schoolId, String status);

    long countByRequestedByUserIdAndStatus(Long requestedByUserId, String status);

    boolean existsByStudentIdAndStatus(Long studentId, String status);

    /** Pessimistic write lock — prevents concurrent double-approvals of the same request. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM StudentDeletionRequest r WHERE r.id = :id")
    Optional<StudentDeletionRequest> findByIdForUpdate(@Param("id") Long id);
}
