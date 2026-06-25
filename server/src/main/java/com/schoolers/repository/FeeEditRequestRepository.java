package com.schoolers.repository;

import com.schoolers.model.FeeEditRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeeEditRequestRepository extends JpaRepository<FeeEditRequest, Long> {

    List<FeeEditRequest> findBySchoolIdOrderByRequestedAtDesc(Long schoolId);

    List<FeeEditRequest> findBySchoolIdAndStatusOrderByRequestedAtDesc(Long schoolId, String status);

    List<FeeEditRequest> findByRequestedByUserIdOrderByRequestedAtDesc(Long userId);

    Optional<FeeEditRequest> findByRequestId(String requestId);

    long countBySchoolIdAndStatus(Long schoolId, String status);

    long countByRequestedByUserIdAndStatus(Long requestedByUserId, String status);

    /** Pessimistic write lock — prevents concurrent double-approvals of the same request. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM FeeEditRequest r WHERE r.id = :id")
    Optional<FeeEditRequest> findByIdForUpdate(@Param("id") Long id);
}
