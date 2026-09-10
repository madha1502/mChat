package com.mchat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

public class MessageDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {
        private String clientMessageId;
        private String conversationId;
        private String recipientId;
        private String messageType = "text";
        private String content;
        private String mediaUrl;
        private String mediaType;
        private String fileName;
        private Long fileSize;
        private Map<String, Object> location;
        private Map<String, Object> contact;
        private String replyTo; // replyTo message ID
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EditMessageRequest {
        private String content;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReactMessageRequest {
        private String emoji;
    }
}
