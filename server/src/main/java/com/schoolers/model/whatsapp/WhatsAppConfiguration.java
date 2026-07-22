package com.schoolers.model.whatsapp;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/** A school's own Meta WhatsApp Cloud API credentials — each school registers its own phone number. */
@Entity
@Table(name = "whatsapp_configurations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false, unique = true)
    private Long schoolId;

    @Column(name = "phone_number_id", length = 50)
    private String phoneNumberId;

    @Column(name = "access_token_encrypted", length = 1024)
    private String accessTokenEncrypted;

    @Column(name = "display_phone_number", length = 20)
    private String displayPhoneNumber;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
