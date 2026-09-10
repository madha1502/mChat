package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Entity
@Table(name = "statuses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusStory {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonProperty("userId")
    private User user;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String type = "text"; // text, image, video

    @Column(length = 2000)
    private String content;

    @Column(length = 1000)
    private String mediaUrl;

    @Column(length = 500)
    private String caption;

    private String backgroundColor;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String privacy = "everyone"; // everyone, contacts, selected

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "status_viewers", joinColumns = @JoinColumn(name = "status_id"))
    @Builder.Default
    private List<ViewerRecord> viewers = new ArrayList<>();

    @Column(nullable = false)
    private Instant expiresAt;

    @CreationTimestamp
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.expiresAt == null) {
            this.expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
        }
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ViewerRecord {
        private String userId;
        private String userName;
        private String userPicture;
        @Builder.Default
        private Instant viewedAt = Instant.now();

        @JsonProperty("user")
        public Map<String, Object> getUserMap() {
            Map<String, Object> map = new HashMap<>();
            map.put("_id", userId);
            map.put("name", userName);
            map.put("profilePicture", userPicture);
            return map;
        }
    }
}
