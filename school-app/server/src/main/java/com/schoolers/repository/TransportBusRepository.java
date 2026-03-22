package com.schoolers.repository;

import com.schoolers.model.TransportBus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransportBusRepository extends JpaRepository<TransportBus, Long> {
    Optional<TransportBus> findByBusNo(String busNo);
    boolean existsByBusNo(String busNo);
}
