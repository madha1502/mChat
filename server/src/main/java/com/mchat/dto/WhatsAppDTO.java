package com.mchat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class WhatsAppDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulateMessageRequest {
        private String fromPhoneNumber;
        private String customerName;
        private String text;
        private String businessPhoneNumberId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConnectIntegrationRequest {
        private String phoneNumberId;
        private String businessAccountId;
        private String accessToken;
        private String displayPhoneNumber;
    }
}
