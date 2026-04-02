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

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);
}
