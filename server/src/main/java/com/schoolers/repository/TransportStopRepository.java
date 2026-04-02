package com.schoolers.repository;

import com.schoolers.model.TransportStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransportStopRepository extends JpaRepository<TransportStop, Long> {
    List<TransportStop> findByRouteIdOrderByStopOrder(Long routeId);
}
