package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "whatsapp_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppIntegration {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @Column(nullable = false)
    private String userId;

    private String businessAccountId;

    @Column(nullable = false)
    private String phoneNumberId;

    private String displayPhoneNumber;

    @Column(length = 2000)
    private String accessTokenEncrypted;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active"; // active, disconnected, error

    private String webhookSecret;

    @CreationTimestamp
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
