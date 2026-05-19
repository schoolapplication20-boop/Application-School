package com.schoolers.repository;

import com.schoolers.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId);

    @Modifying @Transactional
    @Query("DELETE FROM ChatSession cs WHERE cs.userId IN (SELECT u.id FROM User u WHERE u.schoolId = :schoolId)")
    void deleteBySchoolId(@Param("schoolId") Long schoolId);
}
