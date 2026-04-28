package com.schoolers.repository;

import com.schoolers.model.TransportBus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransportBusRepository extends JpaRepository<TransportBus, Long> {
    Optional<TransportBus> findByBusNo(String busNo);
    boolean existsByBusNo(String busNo);

    // School-scoped queries
    List<TransportBus> findBySchoolIdOrderByBusNoAsc(Long schoolId);
    Optional<TransportBus> findByBusNoAndSchoolId(String busNo, Long schoolId);
    boolean existsByBusNoAndSchoolId(String busNo, Long schoolId);
}
