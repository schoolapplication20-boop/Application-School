package com.schoolers.repository;

import com.schoolers.model.MeetingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MeetingSlotRepository extends JpaRepository<MeetingSlot, Long> {

    List<MeetingSlot> findByTeacherIdOrderByMeetingDateAscStartTimeAsc(Long teacherId);

    List<MeetingSlot> findBySchoolIdAndIsAvailableTrueAndMeetingDateGreaterThanEqualOrderByMeetingDateAscStartTimeAsc(Long schoolId, LocalDate from);

    List<MeetingSlot> findByTeacherIdAndMeetingDateGreaterThanEqualOrderByMeetingDateAscStartTimeAsc(Long teacherId, LocalDate from);

    void deleteBySchoolId(Long schoolId);
}
