package com.schoolers.repository;

import com.schoolers.model.LeaveRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByRequesterId(Long requesterId);
    List<LeaveRequest> findByRequesterTypeAndStatus(LeaveRequest.RequesterType requesterType, LeaveRequest.Status status);
    List<LeaveRequest> findByRequesterIdAndRequesterType(Long requesterId, LeaveRequest.RequesterType requesterType);

    /** Legacy (no schoolId) leave list, newest first, capped via Pageable */
    List<LeaveRequest> findByRequesterTypeOrderByCreatedAtDesc(
            LeaveRequest.RequesterType requesterType, Pageable pageable);

    /** Ordered query for student's own leave history, capped via Pageable */
    List<LeaveRequest> findByRequesterIdAndRequesterTypeOrderByCreatedAtDesc(
            Long requesterId, LeaveRequest.RequesterType requesterType, Pageable pageable);

    /** All student leaves for a specific class section, newest first, capped via Pageable */
    List<LeaveRequest> findByClassSectionAndRequesterTypeOrderByCreatedAtDesc(
            String classSection, LeaveRequest.RequesterType requesterType, Pageable pageable);

    /** School-scoped: student leaves for a specific class section, capped via Pageable */
    List<LeaveRequest> findByClassSectionAndRequesterTypeAndSchoolIdOrderByCreatedAtDesc(
            String classSection, LeaveRequest.RequesterType requesterType, Long schoolId, Pageable pageable);

    /** School-scoped: all leaves of a given requester type for one school, capped via Pageable */
    List<LeaveRequest> findByRequesterTypeAndSchoolIdOrderByCreatedAtDesc(
            LeaveRequest.RequesterType requesterType, Long schoolId, Pageable pageable);

    /** School-scoped: a specific teacher's own leave history, capped via Pageable */
    List<LeaveRequest> findByRequesterIdAndRequesterTypeAndSchoolIdOrderByCreatedAtDesc(
            Long requesterId, LeaveRequest.RequesterType requesterType, Long schoolId, Pageable pageable);

    Optional<LeaveRequest> findByParentToken(String parentToken);

    @Modifying @Transactional
    void deleteByClassSection(String classSection);

    @Modifying @Transactional
    void deleteByRequesterId(Long requesterId);

    @Modifying @Transactional
    void deleteByRequesterIdAndRequesterType(Long requesterId, LeaveRequest.RequesterType requesterType);

    @Modifying @Transactional
    void deleteByRequesterIdInAndRequesterType(List<Long> requesterIds, LeaveRequest.RequesterType requesterType);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
