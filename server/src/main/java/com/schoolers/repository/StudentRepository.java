package com.schoolers.repository;

import com.schoolers.model.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByRollNumber(String rollNumber);

    List<Student> findByClassName(String className);

    List<Student> findByClassNameAndSection(String className, String section);

    List<Student> findByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section);

    long countByClassNameAndSection(String className, String section);

    long countByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section);

    List<Student> findByParentId(Long parentId);

    Optional<Student> findByStudentUserId(Long studentUserId);

    long countByIsActive(Boolean isActive);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND (LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Student> searchStudents(@Param("search") String search, Pageable pageable);

    @Query("SELECT s FROM Student s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:s,'%')) OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:s,'%')) OR s.parentMobile LIKE CONCAT('%',:s,'%') OR s.motherMobile LIKE CONCAT('%',:s,'%') OR s.guardianMobile LIKE CONCAT('%',:s,'%')")
    List<Student> searchByNameRollOrPhone(@Param("s") String search);

    @Query("SELECT s FROM Student s WHERE LOWER(s.rollNumber) = LOWER(:roll) AND LOWER(s.className) = LOWER(:cls) AND LOWER(COALESCE(s.section,'')) = LOWER(COALESCE(:sec,''))")
    Optional<Student> findDuplicateInClass(@Param("roll") String rollNumber, @Param("cls") String className, @Param("sec") String section);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("DELETE FROM Student s WHERE LOWER(s.className) = LOWER(:cls) AND LOWER(s.section) = LOWER(:sec)")
    int deleteByClassNameIgnoreCaseAndSectionIgnoreCase(@Param("cls") String className, @Param("sec") String section);
}
