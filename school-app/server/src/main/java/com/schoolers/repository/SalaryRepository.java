package com.schoolers.repository;

import com.schoolers.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, Long> {
    List<Salary> findByStaffId(Long staffId);
    List<Salary> findByMonthAndYear(String month, String year);
    List<Salary> findByStatus(Salary.Status status);
}
