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

    /**
     * JPQL ORDER BY fragment that ranks a class name the same way as classOrderRank() in
     * AdminService and classOrder() in client/src/utils/classOrder.js: Nursery, LKG, UKG,
     * then grade 1-12 (accepting digit, "Class N", or Roman-numeral spellings), then anything
     * unrecognized last. Deliberately not alphabetic — alphabetic order puts "X" before "IX".
     * Kept as a compile-time constant so it can be concatenated straight into @Query strings.
     */
    String CLASS_ORDER_CASE =
        "CASE " +
        "WHEN LOWER(TRIM(s.className)) LIKE '%nursery%' THEN -3 " +
        "WHEN LOWER(TRIM(s.className)) LIKE '%lkg%' THEN -2 " +
        "WHEN LOWER(TRIM(s.className)) LIKE '%ukg%' THEN -1 " +
        "WHEN LOWER(TRIM(s.className)) IN ('i','1','class 1') THEN 1 " +
        "WHEN LOWER(TRIM(s.className)) IN ('ii','2','class 2') THEN 2 " +
        "WHEN LOWER(TRIM(s.className)) IN ('iii','3','class 3') THEN 3 " +
        "WHEN LOWER(TRIM(s.className)) IN ('iv','4','class 4') THEN 4 " +
        "WHEN LOWER(TRIM(s.className)) IN ('v','5','class 5') THEN 5 " +
        "WHEN LOWER(TRIM(s.className)) IN ('vi','6','class 6') THEN 6 " +
        "WHEN LOWER(TRIM(s.className)) IN ('vii','7','class 7') THEN 7 " +
        "WHEN LOWER(TRIM(s.className)) IN ('viii','8','class 8') THEN 8 " +
        "WHEN LOWER(TRIM(s.className)) IN ('ix','9','class 9') THEN 9 " +
        "WHEN LOWER(TRIM(s.className)) IN ('x','10','class 10') THEN 10 " +
        "WHEN LOWER(TRIM(s.className)) IN ('xi','11','class 11') THEN 11 " +
        "WHEN LOWER(TRIM(s.className)) IN ('xii','12','class 12') THEN 12 " +
        "ELSE 999 END";

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    /**
     * Returns distinct (className, section) pairs for a school.
     * Used to populate class dropdowns when no ClassRoom entities are configured.
     * Each element is Object[]{className, section} — section may be null.
     */
    @Query("SELECT DISTINCT s.className, s.section FROM Student s " +
           "WHERE s.schoolId = :schoolId AND s.className IS NOT NULL " +
           "ORDER BY s.className, s.section")
    List<Object[]> findDistinctClassNamesBySchoolId(@Param("schoolId") Long schoolId);

    Page<Student> findBySchoolId(Long schoolId, Pageable pageable);

    List<Student> findBySchoolId(Long schoolId);

    long countBySchoolId(Long schoolId);

    long countBySchoolIdAndIsActive(Long schoolId, Boolean isActive);

    List<Student> findBySchoolIdAndClassName(Long schoolId, String className);

    /**
     * Same as findBySchoolIdAndClassName but tolerant of case differences and
     * leading/trailing whitespace, so fee-structure auto-apply doesn't silently
     * skip students whose stored className differs only by case/spacing.
     * Only matches active students (isActive true or unset).
     */
    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND LOWER(TRIM(s.className)) = LOWER(TRIM(:className)) " +
           "AND (s.isActive IS NULL OR s.isActive = true)")
    List<Student> findBySchoolIdAndClassNameNormalized(@Param("schoolId") Long schoolId, @Param("className") String className);

    List<Student> findBySchoolIdAndClassNameAndSection(Long schoolId, String className, String section);

    List<Student> findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(Long schoolId, String className, String section);

    /** Same match, ordered for display — used by the "View Students" modal so rows are roll-number order, not DB insertion order. */
    List<Student> findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCaseOrderByRollNumberAscNameAsc(Long schoolId, String className, String section);

    /** Same match, no section filter — used when a class-wide (all sections) export/report is requested. */
    List<Student> findBySchoolIdAndClassNameIgnoreCaseOrderByRollNumberAscNameAsc(Long schoolId, String className);

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

    /**
     * Batch enrollment count for all classes in a school — returns [LOWER(className), LOWER(COALESCE(section,'')), count] rows.
     * Used by getClasses() to replace N per-class queries with a single query.
     */
    @Query("SELECT LOWER(s.className), LOWER(COALESCE(s.section, '')), COUNT(s) " +
           "FROM Student s WHERE s.schoolId = :schoolId " +
           "AND (s.isActive IS NULL OR s.isActive = true) " +
           "GROUP BY LOWER(s.className), LOWER(COALESCE(s.section, ''))")
    List<Object[]> countEnrolledByClassForSchool(@Param("schoolId") Long schoolId);

    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId AND s.isActive = true AND (LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Student> searchStudentsBySchool(@Param("schoolId") Long schoolId, @Param("search") String search, Pageable pageable);

    /** Single query that handles search + className + status filters together.
     *  Pass empty string to skip a filter (avoids multiple query methods).
     *  Caller must escape LIKE special chars (% and _) before binding :search. */
    @Query("SELECT s FROM Student s WHERE s.schoolId = :schoolId " +
           "AND (:search = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\' OR LOWER(s.rollNumber) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\' OR s.parentMobile LIKE CONCAT('%',:search,'%') ESCAPE '\\') " +
           "AND (:className = '' OR LOWER(s.className) = LOWER(:className)) " +
           "AND (:status = '' OR (:status = 'Active' AND s.isActive = true AND s.studentUserId IS NOT NULL) OR (:status = 'Inactive' AND (s.isActive = false OR s.isActive IS NULL OR s.studentUserId IS NULL))) " +
           "ORDER BY " + CLASS_ORDER_CASE + ", s.section ASC, s.rollNumber ASC, s.name ASC")
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

    /** Students who have no login account yet (imported without createAccounts). */
    List<Student> findBySchoolIdAndStudentUserIdIsNull(Long schoolId);

    /**
     * Lightweight projection used by BulkImportJobProcessor to build duplicate-detection sets.
     * Returns only (admissionNumber, rollNumber, className, section) to avoid loading all
     * mapped fields for potentially thousands of students on every import job.
     */
    @Query("SELECT s.admissionNumber AS admissionNumber, s.rollNumber AS rollNumber, " +
           "s.className AS className, s.section AS section " +
           "FROM Student s WHERE s.schoolId = :schoolId")
    List<StudentKeyProjection> findKeysBySchoolId(@Param("schoolId") Long schoolId);

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

    /** Look up a student by parent/guardian mobile — used for transactional SMS delivery. */
    java.util.Optional<com.schoolers.model.Student> findFirstByParentMobile(String parentMobile);
    java.util.Optional<com.schoolers.model.Student> findFirstByGuardianMobile(String guardianMobile);
}
