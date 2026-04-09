package com.schoolers.repository;

import com.schoolers.model.StudentTransport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTransportRepository extends JpaRepository<StudentTransport, Long> {
    Optional<StudentTransport> findByStudentId(Long studentId);
    List<StudentTransport> findByRouteId(Long routeId);
    List<StudentTransport> findByStatus(String status);
    boolean existsByStudentId(Long studentId);
}
