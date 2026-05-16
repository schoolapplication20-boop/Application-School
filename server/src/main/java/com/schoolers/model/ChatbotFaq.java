package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chatbot_faq")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotFaq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(length = 100)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String keywords; // comma-separated keyword list
}
