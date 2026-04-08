package com.schoolers.repository;

import com.schoolers.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, Long> {
    List<Salary> findByStaffId(Long staffId);
    List<Salary> findByMonthAndYear(String month, String year);
    List<Salary> findByStatus(Salary.Status status);
    Optional<Salary> findByStaffIdAndMonthAndYear(Long staffId, String month, String year);

    @Modifying @Transactional
    void deleteByStaffId(Long staffId);
}
