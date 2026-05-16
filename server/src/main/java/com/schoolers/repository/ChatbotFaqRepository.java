package com.schoolers.repository;

import com.schoolers.model.ChatbotFaq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatbotFaqRepository extends JpaRepository<ChatbotFaq, Long> {
    List<ChatbotFaq> findByCategory(String category);
    boolean existsByQuestion(String question);
}
