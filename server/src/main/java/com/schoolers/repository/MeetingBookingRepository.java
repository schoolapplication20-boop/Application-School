package com.schoolers.repository;

import com.schoolers.model.MeetingBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MeetingBookingRepository extends JpaRepository<MeetingBooking, Long> {

    List<MeetingBooking> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<MeetingBooking> findBySlotIdOrderByCreatedAtAsc(Long slotId);

    long countBySlotIdAndStatus(Long slotId, MeetingBooking.Status status);

    boolean existsBySlotIdAndStudentId(Long slotId, Long studentId);

    void deleteBySchoolId(Long schoolId);
}
