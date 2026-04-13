package com.schoolers.repository;

import com.schoolers.model.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {
    Optional<School> findByCode(String code);
    Optional<School> findByEmail(String email);
    boolean existsByCode(String code);
    boolean existsByEmail(String email);
}
