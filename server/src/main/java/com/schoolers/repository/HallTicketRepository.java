package com.schoolers.repository;

import com.schoolers.model.HallTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface HallTicketRepository extends JpaRepository<HallTicket, Long> {
    Optional<HallTicket> findByTicketNumber(String ticketNumber);
    List<HallTicket> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<HallTicket> findByClassNameAndExamNameOrderByStudentNameAsc(String className, String examName);
    List<HallTicket> findByExamTypeOrderByCreatedAtDesc(String examType);
    List<HallTicket> findAllByOrderByCreatedAtDesc();
    boolean existsByTicketNumber(String ticketNumber);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);
}
