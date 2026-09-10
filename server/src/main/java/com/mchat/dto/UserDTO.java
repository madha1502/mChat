package com.mchat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class UserDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProfileRequest {
        private String name;
        private String username;
        private String about;
        private String profilePicture;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePrivacyRequest {
        private String lastSeen;
        private String profilePicture;
        private String about;
        private String status;
        private Boolean readReceipts;
        private Boolean typingIndicator;
    }
}
