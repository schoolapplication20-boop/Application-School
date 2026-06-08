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

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    Page<Student> findBySchoolId(Long schoolId, Pageable pageable);

    List<Student> findBySchoolId(Long schoolId);

    long countBySchoolId(Long schoolId);

    long countBySchoolIdAndIsActive(Long schoolId, Boolean isActive);

    List<Student> findBySchoolIdAndClassName(Long schoolId, String className);

    List<Student> findBySchoolIdAndClassNameAndSection(Long schoolId, String className, String section);

    List<Student> findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(Long schoolId, String className, String section);

    long countBySchoolIdAndClassNameAndSection(Long schoolId, String className, String section);

    long countBySchoolIdAndClassNameAndSectionAndIsActive(Long schoolId, String className, String section, Boolean isActive);

    /**
     * Capacity count: case-insensitive match on className + section, scoped to school.
     * Counts students where isActive is TRUE or NULL (excludes only explicitly inactive students).
     * This is the authoritative query used for all capacity enforcement.
     */
    @Query("SELECT COUNT(s) FROM Student s WHERE s.schoolId = :schoolId " +
           "AND LOWER(s.className) = LOWER(:className) " +
           "AND LOWER(COALESCE(s.section, '')) = LOWER(COALESCE(:section, '')) " +
           "AND (s.isActive IS NULL OR s.isActive = true)")
    long countEnrolledForCapacity(@Param("schoolId") Long schoolId,
                                   @Param("className") String className,
                                   @Param("section") String section);

    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND s.isActive = true AND (LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Student> searchStudentsBySchool(@Param("schoolId") Long schoolId, @Param("search") String search, Pageable pageable);

    /** Single query that handles search + className + status filters together.
     *  Pass empty string to skip a filter (avoids multiple query methods).
     *  Caller must escape LIKE special chars (% and _) before binding :search. */
    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId " +
           "AND (:search = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\' OR s.parentMobile LIKE CONCAT('%',:search,'%') ESCAPE '\\') " +
           "AND (:className = '' OR LOWER(s.className) = LOWER(:className)) " +
           "AND (:status = '' OR (:status = 'Active' AND s.isActive = true AND s.studentUserId IS NOT NULL) OR (:status = 'Inactive' AND (s.isActive = false OR s.isActive IS NULL OR s.studentUserId IS NULL)))")
    Page<Student> findByFilters(
        @Param("schoolId") Long schoolId,
        @Param("search") String search,
        @Param("className") String className,
        @Param("status") String status,
        Pageable pageable);

    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND (LOWER(s.name) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR s.parentMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.motherMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.guardianMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\')")
    List<Student> searchBySchoolAndNameRollOrPhone(@Param("schoolId") Long schoolId, @Param("s") String search);

    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND LOWER(s.rollNumber) = LOWER(:roll) AND LOWER(s.className) = LOWER(:cls) AND LOWER(COALESCE(s.section,'')) = LOWER(COALESCE(:sec,''))")
    Optional<Student> findDuplicateInClassAndSchool(@Param("schoolId") Long schoolId, @Param("roll") String rollNumber, @Param("cls") String className, @Param("sec") String section);

 

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("DELETE FROM Student s WHERE s.schoolId = :schoolId AND LOWER(s.className) = LOWER(:cls) AND LOWER(s.section) = LOWER(:sec)")
    int deleteBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(@Param("schoolId") Long schoolId, @Param("cls") String className, @Param("sec") String section);

    // ── Lookup helpers (school-agnostic — used for FK resolution) ─────────────

    Optional<Student> findByRollNumber(String rollNumber);

    List<Student> findByClassName(String className);

    List<Student> findByClassNameAndSection(String className, String section);

    List<Student> findByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section);

    /**
     * Flexible class lookup: matches students stored in either format —
     *   • Separate: className="LKG", section="B"
     *   • Combined: className="LKG-B", section=null/empty
     */
    @Query("SELECT s FROM Student s WHERE " +
           "LOWER(s.className) = LOWER(:combinedName) OR " +
           "(LOWER(s.className) = LOWER(:className) AND LOWER(COALESCE(s.section,'')) = LOWER(:section))")
    List<Student> findByClassFlexible(
            @Param("combinedName") String combinedName,
            @Param("className")    String className,
            @Param("section")      String section);

    /** Same as above but school-scoped (multi-tenant). */
    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND (" +
           "LOWER(s.className) = LOWER(:combinedName) OR " +
           "(LOWER(s.className) = LOWER(:className) AND LOWER(COALESCE(s.section,'')) = LOWER(:section)))")
    List<Student> findBySchoolIdAndClassFlexible(
            @Param("schoolId")     Long schoolId,
            @Param("combinedName") String combinedName,
            @Param("className")    String className,
            @Param("section")      String section);

    long countByClassNameAndSection(String className, String section);

    long countByClassNameIgnoreCaseAndSectionIgnoreCase(String className, String section);

    List<Student> findByParentId(Long parentId);

    Optional<Student> findByStudentUserId(Long studentUserId);

    List<Student> findAllByAdmissionNumberIgnoreCase(String admissionNumber);

    Optional<Student> findBySchoolIdAndAdmissionNumberIgnoreCase(Long schoolId, String admissionNumber);

    long countByIsActive(Boolean isActive);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND (LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\')")
    Page<Student> searchStudents(@Param("search") String search, Pageable pageable);

    @Query("SELECT s FROM Student s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR s.parentMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.motherMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.guardianMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\'")
    List<Student> searchByNameRollOrPhone(@Param("s") String search);

    /** Pageable overload of searchByNameRollOrPhone. Caller must escape '%' and '_' in :s with '\'. */
    @Query("SELECT s FROM Student s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:s,'%')) ESCAPE '\\' OR s.parentMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.motherMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\' OR s.guardianMobile LIKE CONCAT('%',:s,'%') ESCAPE '\\'")
    Page<Student> searchByNameRollOrPhonePageable(@Param("s") String search, Pageable pageable);

    @Query("SELECT s FROM Student s WHERE LOWER(s.rollNumber) = LOWER(:roll) AND LOWER(s.className) = LOWER(:cls) AND LOWER(COALESCE(s.section,'')) = LOWER(COALESCE(:sec,''))")
    Optional<Student> findDuplicateInClass(@Param("roll") String rollNumber, @Param("cls") String className, @Param("sec") String section);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("DELETE FROM Student s WHERE LOWER(s.className) = LOWER(:cls) AND LOWER(s.section) = LOWER(:sec)")
    int deleteByClassNameIgnoreCaseAndSectionIgnoreCase(@Param("cls") String className, @Param("sec") String section);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);

    /**
     * Bulk rename: updates className and section for all students in a given class/section/school.
     * Used by updateClass to avoid a per-student save loop (N+1 writes).
     */
    @Modifying
    @Transactional
    @Query("UPDATE Student s SET s.className = :newName, s.section = :newSection " +
           "WHERE s.className = :oldName AND s.section = :oldSection AND s.schoolId = :schoolId")
    int bulkUpdateClassName(@Param("oldName") String oldName,
                            @Param("oldSection") String oldSection,
                            @Param("newName") String newName,
                            @Param("newSection") String newSection,
                            @Param("schoolId") Long schoolId);
}
