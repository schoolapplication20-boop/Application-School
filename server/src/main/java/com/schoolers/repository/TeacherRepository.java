package com.schoolers.repository;

import com.schoolers.model.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    List<Teacher> findBySchoolId(Long schoolId);

    long countBySchoolId(Long schoolId);

    long countBySchoolIdAndIsActive(Long schoolId, Boolean isActive);

    Optional<Teacher> findBySchoolIdAndEmployeeId(Long schoolId, String employeeId);

    boolean existsByEmployeeIdAndSchoolId(String employeeId, Long schoolId);

    boolean existsByEmployeeIdAndSchoolIdAndIdNot(String employeeId, Long schoolId, Long id);

    // ── Lookup helpers ────────────────────────────────────────────────────────

    Optional<Teacher> findByEmployeeId(String employeeId);

    @Query("SELECT t FROM Teacher t WHERE t.user.id = :userId")
    Optional<Teacher> findByUserId(@Param("userId") Long userId);

    List<Teacher> findBySubject(String subject);
    long countByIsActive(Boolean isActive);
}
