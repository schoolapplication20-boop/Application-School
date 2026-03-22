package com.schoolers.repository;

import com.schoolers.model.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {
    Optional<Certificate> findByCertificateId(String certificateId);
    List<Certificate> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<Certificate> findByCertificateTypeOrderByCreatedAtDesc(String certificateType);
    List<Certificate> findAllByOrderByCreatedAtDesc();
    boolean existsByCertificateId(String certificateId);
}
