package com.schoolers.repository;

import com.schoolers.model.TransportFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransportFeeRepository extends JpaRepository<TransportFee, Long> {
    List<TransportFee> findByStudentId(Long studentId);
    List<TransportFee> findByStatus(TransportFee.Status status);
}
