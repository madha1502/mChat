package com.mchat.dto;

import com.mchat.model.Conversation;
import lombok.*;

import java.util.List;

public class ConversationDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateConversationRequest {
        private String type = "private"; // private, group
        private String recipientId;
        private String name;
        private String description;
        private String image;
        private List<String> memberIds;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateGroupRequest {
        private String name;
        private String description;
        private String image;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddMembersRequest {
        private List<String> memberIds;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DisappearingTimerRequest {
        private Integer disappearingTimer; // in seconds (0, 86400, 604800, 7776000)
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FormattedConversation {
        private Conversation conversation;
        private Integer unreadCount;
        private Boolean isPinned;
        private Boolean isArchived;
        private Boolean isMuted;
    }
}
