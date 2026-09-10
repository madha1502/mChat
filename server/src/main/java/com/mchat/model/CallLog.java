package com.mchat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "call_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallLog {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    @JsonProperty("_id")
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "caller_id", nullable = false)
    @JsonProperty("callerId")
    private User caller;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "receiver_id", nullable = false)
    @JsonProperty("receiverId")
    private User receiver;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String type = "audio"; // audio, video

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ringing"; // ringing, connected, rejected, missed, ended

    private Instant startedAt;
    private Instant endedAt;
    private Integer duration; // seconds

    @CreationTimestamp
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
