package com.mchat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class CallDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogCallRequest {
        private String receiverId;
        private String type = "audio"; // audio, video
        private String status = "ringing"; // ringing, connected, rejected, missed, ended
        private Integer duration;
    }
}
