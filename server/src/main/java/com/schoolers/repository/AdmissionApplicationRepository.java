package com.schoolers.repository;

import com.schoolers.model.AdmissionApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdmissionApplicationRepository extends JpaRepository<AdmissionApplication, Long> {
    List<AdmissionApplication> findByStatus(AdmissionApplication.Status status);
    List<AdmissionApplication> findAllByOrderByCreatedAtDesc();

    // School-scoped queries
    List<AdmissionApplication> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    List<AdmissionApplication> findByStatusAndSchoolId(AdmissionApplication.Status status, Long schoolId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
