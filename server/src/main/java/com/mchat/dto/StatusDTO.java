package com.mchat.dto;

import com.mchat.model.StatusStory;
import com.mchat.model.User;
import lombok.*;

import java.util.List;

public class StatusDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateStatusRequest {
        private String type = "text"; // text, image, video
        private String content;
        private String mediaUrl;
        private String caption;
        private String backgroundColor;
        private String privacy = "everyone";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatusUserGroup {
        private User user;
        private List<StatusStory> statuses;
        private boolean allViewed;
    }
}
