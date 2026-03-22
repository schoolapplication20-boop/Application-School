package com.schoolers.repository;

import com.schoolers.model.TransportStudentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransportStudentAssignmentRepository extends JpaRepository<TransportStudentAssignment, Long> {
    Optional<TransportStudentAssignment> findByStudentId(Long studentId);
    List<TransportStudentAssignment> findByBusId(Long busId);
}
