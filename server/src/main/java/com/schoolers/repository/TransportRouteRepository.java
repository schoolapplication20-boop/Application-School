package com.schoolers.repository;

import com.schoolers.model.TransportRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransportRouteRepository extends JpaRepository<TransportRoute, Long> {
    List<TransportRoute> findBySchoolIdOrderByNameAsc(Long schoolId);
}
