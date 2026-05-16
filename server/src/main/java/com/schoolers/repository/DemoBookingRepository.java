package com.schoolers.repository;

import com.schoolers.model.DemoBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DemoBookingRepository extends JpaRepository<DemoBooking, Long> {
    List<DemoBooking> findAllByOrderByCreatedAtDesc();
    List<DemoBooking> findByStatusOrderByCreatedAtDesc(String status);
}
