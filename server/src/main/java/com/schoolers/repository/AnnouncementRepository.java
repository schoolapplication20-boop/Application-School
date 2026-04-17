package com.schoolers.repository;

import com.schoolers.model.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findByIsActiveTrueOrderByCreatedAtDesc();
    List<Announcement> findByTargetRoleInOrderByCreatedAtDesc(List<String> roles);

    // School-scoped queries
    List<Announcement> findBySchoolIdAndIsActiveTrueOrderByCreatedAtDesc(Long schoolId);
    List<Announcement> findBySchoolIdAndTargetRoleInOrderByCreatedAtDesc(Long schoolId, List<String> roles);
}
