package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Role { USER, ASSISTANT }
}
