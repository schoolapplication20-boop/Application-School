package com.schoolers.repository;

import com.schoolers.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    @Transactional
    @Modifying
    void deleteBySessionId(Long sessionId);

    @Transactional
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM ChatMessage cm WHERE cm.sessionId IN (SELECT cs.id FROM ChatSession cs WHERE cs.userId IN (SELECT u.id FROM User u WHERE u.schoolId = :schoolId))")
    void deleteBySchoolId(@org.springframework.data.repository.query.Param("schoolId") Long schoolId);
}
