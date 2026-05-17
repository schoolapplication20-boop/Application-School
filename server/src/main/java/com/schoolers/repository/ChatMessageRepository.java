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
}
