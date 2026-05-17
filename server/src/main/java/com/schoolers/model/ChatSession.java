package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_sessions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatSession {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(length = 200)
    @Builder.Default
    private String title = "New Chat";

    @Column(length = 10)
    @Builder.Default
    private String lang = "en";

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
