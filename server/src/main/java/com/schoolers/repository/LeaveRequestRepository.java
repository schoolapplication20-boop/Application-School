package com.schoolers.repository;

import com.schoolers.model.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByRequesterType(LeaveRequest.RequesterType requesterType);
    List<LeaveRequest> findByRequesterId(Long requesterId);
    List<LeaveRequest> findByRequesterTypeAndStatus(LeaveRequest.RequesterType requesterType, LeaveRequest.Status status);
    List<LeaveRequest> findByRequesterIdAndRequesterType(Long requesterId, LeaveRequest.RequesterType requesterType);

    @Modifying @Transactional
    void deleteByRequesterId(Long requesterId);
}
