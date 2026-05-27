package com.schoolers.repository;

import com.schoolers.model.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, Long> {
    boolean existsByKeyAndSchoolId(String key, Long schoolId);
    void deleteBySchoolId(Long schoolId);
}
