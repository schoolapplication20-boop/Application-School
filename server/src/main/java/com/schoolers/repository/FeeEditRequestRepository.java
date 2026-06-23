package com.schoolers.repository;

import com.schoolers.model.FeeEditRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FeeEditRequestRepository extends JpaRepository<FeeEditRequest, Long> {

    List<FeeEditRequest> findBySchoolIdOrderByRequestedAtDesc(Long schoolId);

    List<FeeEditRequest> findBySchoolIdAndStatusOrderByRequestedAtDesc(Long schoolId, String status);

    List<FeeEditRequest> findByRequestedByUserIdOrderByRequestedAtDesc(Long userId);

    Optional<FeeEditRequest> findByRequestId(String requestId);

    long countBySchoolIdAndStatus(Long schoolId, String status);
}
