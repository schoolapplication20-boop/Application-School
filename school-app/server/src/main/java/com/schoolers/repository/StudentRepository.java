package com.schoolers.repository;

import com.schoolers.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByRollNumber(String rollNumber);
    @Query("SELECT s FROM Student s WHERE s.rollNumber = :rollNumber AND s.className = :className AND s.section = :section")
    Optional<Student> findDuplicateInClass(@Param("rollNumber") String rollNumber,
                                           @Param("className") String className,
                                           @Param("section") String section);
    List<Student> findByClassName(String className);
    List<Student> findByClassNameAndSection(String className, String section);
    List<Student> findByParentId(Long parentId);
    long countByIsActive(Boolean isActive);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND " +
           "(LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.rollNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Student> searchStudents(@Param("search") String search, Pageable pageable);
}
