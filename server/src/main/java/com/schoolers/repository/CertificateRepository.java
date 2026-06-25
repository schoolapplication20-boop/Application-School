package com.schoolers.repository;

import com.schoolers.model.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    Optional<Certificate> findByCertificateId(String certificateId);
    Optional<Certificate> findByCertificateIdAndSchoolId(String certificateId, Long schoolId);
    List<Certificate> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<Certificate> findByCertificateTypeOrderByCreatedAtDesc(String certificateType);
    List<Certificate> findAllByOrderByCreatedAtDesc();
    boolean existsByCertificateId(String certificateId);

    // School-scoped queries
    List<Certificate> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    List<Certificate> findByCertificateTypeAndSchoolIdOrderByCreatedAtDesc(String certificateType, Long schoolId);
    List<Certificate> findByStudentIdAndSchoolIdOrderByCreatedAtDesc(Long studentId, Long schoolId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentIdIn(List<Long> studentIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
