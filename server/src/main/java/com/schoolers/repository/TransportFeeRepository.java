package com.schoolers.repository;

import com.schoolers.model.TransportFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TransportFeeRepository extends JpaRepository<TransportFee, Long> {
    List<TransportFee> findByStudentId(Long studentId);
    List<TransportFee> findByStatus(TransportFee.Status status);

    // School-scoped queries
    List<TransportFee> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    List<TransportFee> findByStudentIdAndSchoolId(Long studentId, Long schoolId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentIdIn(List<Long> studentIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
