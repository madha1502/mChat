package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String type = "private"; // private, group

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String source = "internal"; // internal, whatsapp_business

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "conversation_participants",
            joinColumns = @JoinColumn(name = "conversation_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @Builder.Default
    private List<User> participants = new ArrayList<>();

    // Group metadata
    private String groupName;

    @Column(length = 1000)
    private String groupDescription;

    @Column(length = 1000)
    private String groupImage;

    private String groupCreatedBy;

    private String groupInviteToken;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_admins", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "admin_user_id")
    @Builder.Default
    private Set<String> groupAdminIds = new HashSet<>();

    // WhatsApp metadata
    private String waCustomerPhone;
    private String waCustomerName;
    private String waPhoneNumberId;
    private String waConversationId;

    // Last message info
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "last_message_id")
    private Message lastMessage;

    private Instant lastMessageAt;

    @Builder.Default
    private Integer disappearingTimer = 0; // seconds

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_pinned", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<String> pinnedBy = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_archived", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<String> archivedBy = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_muted", joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<String> mutedBy = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conversation_unread", joinColumns = @JoinColumn(name = "conversation_id"))
    @MapKeyColumn(name = "user_id")
    @Column(name = "unread_count")
    @Builder.Default
    private Map<String, Integer> unreadCounts = new HashMap<>();

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.lastMessageAt == null) {
            this.lastMessageAt = Instant.now();
        }
    }

    @JsonProperty("group")
    public Map<String, Object> getGroup() {
        if (!"group".equalsIgnoreCase(type) && groupName == null) {
            return null;
        }
        Map<String, Object> g = new HashMap<>();
        g.put("name", groupName != null ? groupName : "Group");
        g.put("description", groupDescription);
        g.put("image", groupImage);
        g.put("admins", groupAdminIds);
        g.put("createdBy", groupCreatedBy);
        g.put("inviteToken", groupInviteToken);
        return g;
    }

    @JsonProperty("whatsappMetadata")
    public Map<String, Object> getWhatsappMetadata() {
        if (!"whatsapp_business".equalsIgnoreCase(source) && waCustomerPhone == null) {
            return null;
        }
        Map<String, Object> wa = new HashMap<>();
        wa.put("customerPhoneNumber", waCustomerPhone);
        wa.put("customerName", waCustomerName);
        wa.put("businessPhoneNumberId", waPhoneNumberId);
        wa.put("waConversationId", waConversationId);
        return wa;
    }
}
