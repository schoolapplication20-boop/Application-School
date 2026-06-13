package com.schoolers.repository;

import com.schoolers.model.ClassFeeStructure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassFeeStructureRepository extends JpaRepository<ClassFeeStructure, Long> {
    Optional<ClassFeeStructure> findByClassNameAndAcademicYearAndSchoolId(String className, String academicYear, Long schoolId);
    Optional<ClassFeeStructure> findByClassNameAndAcademicYear(String className, String academicYear);
    Optional<ClassFeeStructure> findByClassNameAndAcademicYearAndSchoolIdIsNull(String className, String academicYear);
    List<ClassFeeStructure> findByAcademicYear(String academicYear);
    List<ClassFeeStructure> findBySchoolId(Long schoolId);
    Optional<ClassFeeStructure> findByClassName(String className);

    /**
     * Same as findByClassNameAndAcademicYearAndSchoolId but tolerant of case
     * differences and leading/trailing whitespace in className, so a student
     * whose className differs only by case/spacing still matches the fee structure.
     */
    @Query("SELECT c FROM ClassFeeStructure c WHERE c.schoolId = :schoolId " +
           "AND LOWER(TRIM(c.className)) = LOWER(TRIM(:className)) AND c.academicYear = :academicYear")
    Optional<ClassFeeStructure> findBySchoolIdAndClassNameNormalizedAndAcademicYear(
            @Param("schoolId") Long schoolId, @Param("className") String className, @Param("academicYear") String academicYear);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
