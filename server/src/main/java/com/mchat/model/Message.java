package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "messages", indexes = {
        @Index(name = "idx_conv_created", columnList = "conversationId, createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @Column(nullable = false)
    private String clientMessageId;

    @Column(nullable = false, length = 36)
    private String conversationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id")
    @JsonProperty("senderId")
    private User sender;

    private String receiverId;

    @Builder.Default
    private String source = "internal"; // internal, whatsapp_business

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String messageType = "text"; // text, image, video, audio, voice, document, location, contact, system

    @Column(length = 5000, columnDefinition = "TEXT")
    private String content;

    @Column(length = 1000)
    private String mediaUrl;

    private String mediaType;
    private String fileName;
    private Long fileSize;

    // Location details
    private Double locationLat;
    private Double locationLng;
    private String locationName;
    private String locationAddress;

    // Contact details
    private String contactName;
    private String contactEmail;
    private String contactUsername;
    private String contactUserId;

    // Reply and forwarded
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    private String forwardedFrom;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "message_reactions", joinColumns = @JoinColumn(name = "message_id"))
    @Builder.Default
    private List<ReactionItem> reactions = new ArrayList<>();

    @Builder.Default
    private Boolean isEdited = false;

    @Builder.Default
    private Boolean isDeleted = false;

    @Builder.Default
    private Boolean pinned = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "message_starred", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<String> starredBy = new HashSet<>();

    @Builder.Default
    private String status = "sent"; // sending, sent, delivered, read, failed

    private Instant sentAt;
    private Instant deliveredAt;
    private Instant readAt;
    private Instant expiresAt;

    private String whatsappMessageId;
    private String whatsappStatus;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.sentAt == null) {
            this.sentAt = Instant.now();
        }
    }

    @JsonProperty("location")
    public Map<String, Object> getLocation() {
        if (locationLat == null || locationLng == null) return null;
        Map<String, Object> loc = new HashMap<>();
        loc.put("latitude", locationLat);
        loc.put("longitude", locationLng);
        loc.put("name", locationName);
        loc.put("address", locationAddress);
        return loc;
    }

    @JsonProperty("contact")
    public Map<String, Object> getContact() {
        if (contactName == null) return null;
        Map<String, Object> c = new HashMap<>();
        c.put("name", contactName);
        c.put("email", contactEmail);
        c.put("username", contactUsername);
        c.put("userId", contactUserId);
        return c;
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReactionItem {
        @Column(name = "user_id")
        @JsonProperty("user")
        private String user;
        private String emoji;
        @Builder.Default
        private Instant createdAt = Instant.now();
    }
}
