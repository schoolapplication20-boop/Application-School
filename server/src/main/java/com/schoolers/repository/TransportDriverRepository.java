package com.schoolers.repository;

import com.schoolers.model.TransportDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransportDriverRepository extends JpaRepository<TransportDriver, Long> {
    List<TransportDriver> findBySchoolIdOrderByNameAsc(Long schoolId);
}
