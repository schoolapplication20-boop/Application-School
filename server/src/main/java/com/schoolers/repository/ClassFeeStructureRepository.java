package com.schoolers.repository;

import com.schoolers.model.ClassFeeStructure;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
