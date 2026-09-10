package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @Column(unique = true)
    private String googleId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String username;

    @JsonIgnore
    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String profilePicture;

    @Column(length = 500)
    private String about;

    @Builder.Default
    private Boolean isOnline = false;

    private Instant lastSeen;

    // Privacy Settings
    @Builder.Default
    private String privacyLastSeen = "everyone"; // everyone, contacts, nobody

    @Builder.Default
    private String privacyProfilePicture = "everyone";

    @Builder.Default
    private String privacyAbout = "everyone";

    @Builder.Default
    private String privacyStatus = "everyone";

    @Builder.Default
    private Boolean privacyReadReceipts = true;

    @Builder.Default
    private Boolean privacyTypingIndicator = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_blocked", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "blocked_user_id")
    @Builder.Default
    private Set<String> blockedUsers = new HashSet<>();

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.about == null) {
            this.about = "Hey there! I am using mChat 💖";
        }
        if (this.profilePicture == null) {
            this.profilePicture = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + this.username;
        }
    }

    @JsonProperty("privacySettings")
    public Map<String, Object> getPrivacySettings() {
        Map<String, Object> map = new HashMap<>();
        map.put("lastSeen", privacyLastSeen);
        map.put("profilePicture", privacyProfilePicture);
        map.put("about", privacyAbout);
        map.put("status", privacyStatus);
        map.put("readReceipts", privacyReadReceipts);
        map.put("typingIndicator", privacyTypingIndicator);
        return map;
    }
}
