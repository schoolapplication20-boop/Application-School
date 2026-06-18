package com.schoolers.model.sms;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "sms_provider_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsProviderSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false, unique = true)
    private Long schoolId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String provider = "msg91";

    @Column(name = "auth_key_encrypted", length = 512)
    private String authKeyEncrypted;

    @Column(name = "sender_id", length = 20)
    private String senderId;

    @Column(name = "dlt_te_id", length = 100)
    private String dltTeId;

    @Column(length = 5)
    @Builder.Default
    private String route = "4";

    @Column(name = "country_code", length = 5)
    @Builder.Default
    private String countryCode = "91";

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
