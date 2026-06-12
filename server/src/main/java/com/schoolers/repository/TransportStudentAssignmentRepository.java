package com.schoolers.repository;

import com.schoolers.model.TransportStudentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransportStudentAssignmentRepository extends JpaRepository<TransportStudentAssignment, Long> {
    Optional<TransportStudentAssignment> findByStudentId(Long studentId);
    List<TransportStudentAssignment> findByBusId(Long busId);

    // School-scoped queries
    List<TransportStudentAssignment> findBySchoolIdOrderByStudentNameAsc(Long schoolId);
    Optional<TransportStudentAssignment> findByStudentIdAndSchoolId(Long studentId, Long schoolId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentIdIn(List<Long> studentIds);

    @Modifying @Transactional
    void deleteByBusId(Long busId);

    @Modifying @Transactional
    void deleteByRouteId(Long routeId);

    @Modifying @Transactional
    void deleteByStopId(Long stopId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
