package com.schoolers.repository;

import com.schoolers.model.TransportStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TransportStopRepository extends JpaRepository<TransportStop, Long> {
    List<TransportStop> findByRouteIdOrderByStopOrder(Long routeId);
    List<TransportStop> findBySchoolIdOrderByStopOrderAsc(Long schoolId);
    List<TransportStop> findByRouteIdAndSchoolIdOrderByStopOrder(Long routeId, Long schoolId);

    @Modifying @Transactional
    void deleteByRouteId(Long routeId);
}
