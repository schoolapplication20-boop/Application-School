package com.schoolers.repository;

import com.schoolers.model.SalaryPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {
    List<SalaryPayment> findBySalaryIdOrderByPaidDateDesc(Long salaryId);
    List<SalaryPayment> findAllByOrderByPaidDateDescCreatedAtDesc();
}
