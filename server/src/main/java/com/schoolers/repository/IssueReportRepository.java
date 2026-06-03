package com.schoolers.repository;

import com.schoolers.model.IssueReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IssueReportRepository extends JpaRepository<IssueReport, Long> {

    List<IssueReport> findAllByOrderByCreatedAtDesc();

    List<IssueReport> findByStatusOrderByCreatedAtDesc(String status);
}
