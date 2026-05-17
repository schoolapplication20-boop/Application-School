package com.schoolers.repository;

import com.schoolers.model.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId);
}
