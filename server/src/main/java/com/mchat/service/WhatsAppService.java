package com.mchat.service;

import com.mchat.dto.WhatsAppDTO.*;
import com.mchat.model.Conversation;
import com.mchat.model.Message;
import com.mchat.model.User;
import com.mchat.model.WhatsAppIntegration;
import com.mchat.repository.ConversationRepository;
import com.mchat.repository.MessageRepository;
import com.mchat.repository.UserRepository;
import com.mchat.repository.WhatsAppIntegrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WhatsAppService {

    private final WhatsAppIntegrationRepository integrationRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Value("${app.whatsapp.verify-token:aether_meta_verify_token_2026}")
    private String verifyTokenConfig;

    public String verifyWebhook(String mode, String token, String challenge) {
        if ("subscribe".equals(mode) && verifyTokenConfig.equals(token)) {
            return challenge;
        }
        throw new IllegalArgumentException("Invalid verification token or mode");
    }

    @Transactional
    public Message simulateInboundCustomerMessage(String currentUserId, SimulateMessageRequest req) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String phone = req.getFromPhoneNumber();
        String name = req.getCustomerName() != null ? req.getCustomerName() : "WhatsApp Customer";
        String phoneId = req.getBusinessPhoneNumberId() != null ? req.getBusinessPhoneNumberId() : "sim_phone_id_001";

        // Find or create conversation for this WhatsApp customer
        Conversation conv = conversationRepository
                .findByWaCustomerPhoneAndWaPhoneNumberId(phone, phoneId)
                .orElseGet(() -> {
                    Conversation c = Conversation.builder()
                            .type("private")
                            .source("whatsapp_business")
                            .waCustomerPhone(phone)
                            .waCustomerName(name)
                            .waPhoneNumberId(phoneId)
                            .waConversationId("wa_conv_" + UUID.randomUUID())
                            .participants(new ArrayList<>(List.of(user)))
                            .lastMessageAt(Instant.now())
                            .build();
                    return conversationRepository.save(c);
                });

        Message msg = Message.builder()
                .clientMessageId("wa_sim_" + UUID.randomUUID())
                .conversationId(conv.getId())
                .source("whatsapp_business")
                .messageType("text")
                .content(req.getText())
                .status("delivered")
                .whatsappMessageId("wamid." + UUID.randomUUID())
                .whatsappStatus("delivered")
                .sentAt(Instant.now())
                .deliveredAt(Instant.now())
                .build();

        Message saved = messageRepository.save(msg);

        conv.setLastMessage(saved);
        conv.setLastMessageAt(saved.getSentAt());
        int unread = conv.getUnreadCounts().getOrDefault(currentUserId, 0);
        conv.getUnreadCounts().put(currentUserId, unread + 1);
        conversationRepository.save(conv);

        return saved;
    }

    @Transactional
    public WhatsAppIntegration connectIntegration(String userId, ConnectIntegrationRequest req) {
        WhatsAppIntegration integration = integrationRepository.findByUserId(userId)
                .orElseGet(() -> WhatsAppIntegration.builder().userId(userId).build());

        integration.setPhoneNumberId(req.getPhoneNumberId());
        integration.setBusinessAccountId(req.getBusinessAccountId());
        integration.setDisplayPhoneNumber(req.getDisplayPhoneNumber());
        integration.setAccessTokenEncrypted(req.getAccessToken()); // In prod, encrypt with AES-GCM
        integration.setStatus("active");

        return integrationRepository.save(integration);
    }

    public WhatsAppIntegration getIntegration(String userId) {
        return integrationRepository.findByUserId(userId).orElse(null);
    }
}
