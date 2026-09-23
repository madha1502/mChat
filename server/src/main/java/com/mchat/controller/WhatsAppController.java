package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.WhatsAppDTO.*;
import com.mchat.model.Message;
import com.mchat.model.WhatsAppIntegration;
import com.mchat.security.UserPrincipal;
import com.mchat.service.WhatsAppService;
import com.mchat.socket.SocketIOService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final WhatsAppService whatsAppService;
    private final SocketIOService socketIOService;

    /**
     * Meta WhatsApp Official Webhook Verification Handshake
     */
    @GetMapping("/webhook")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String verifyToken,
            @RequestParam("hub.challenge") String challenge) {

        String result = whatsAppService.verifyWebhook(mode, verifyToken, challenge);
        return ResponseEntity.ok(result);
    }

    /**
     * Meta WhatsApp Official Webhook Events Receiver
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> receiveWebhook(@RequestBody Map<String, Object> body) {
        // Meta requires 200 OK fast response
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    /**
     * Inbound WhatsApp Customer Message Simulator (for local testing & dev)
     */
    @PostMapping("/simulate")
    public ResponseEntity<?> simulateMessage(
            @RequestBody SimulateMessageRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = whatsAppService.simulateInboundCustomerMessage(principal.getId(), req);

        // Real-time broadcast to conversation room & notify user
        socketIOService.broadcastToRoom(message.getConversationId(), "new_message", Map.of(
                "message", message,
                "conversationId", message.getConversationId()
        ));
        socketIOService.sendToUser(principal.getId(), "conversation_created", null);

        return ResponseEntity.ok(ApiResponse.ok("Simulated WhatsApp message received", message));
    }

    @PostMapping("/connect")
    public ResponseEntity<?> connectIntegration(
            @RequestBody ConnectIntegrationRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        WhatsAppIntegration integration = whatsAppService.connectIntegration(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("WhatsApp integration connected", integration));
    }

    @GetMapping({"", "/me"})
    public ResponseEntity<?> getIntegration(@AuthenticationPrincipal UserPrincipal principal) {
        WhatsAppIntegration integration = whatsAppService.getIntegration(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(integration));
    }
}
