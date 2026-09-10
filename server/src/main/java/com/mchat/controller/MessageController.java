package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.MessageDTO.*;
import com.mchat.model.Message;
import com.mchat.security.UserPrincipal;
import com.mchat.service.MessageService;
import com.mchat.socket.SocketIOService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final SocketIOService socketIOService;

    @GetMapping("/{conversationId}")
    public ResponseEntity<?> getMessages(
            @PathVariable("conversationId") String conversationId,
            @RequestParam(value = "before", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant before,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {

        List<Message> messages = messageService.getMessages(conversationId, before, limit);
        return ResponseEntity.ok(ApiResponse.ok(messages));
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestBody SendMessageRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.createMessage(principal.getId(), req);

        // Real-time broadcast to conversation room
        socketIOService.broadcastToRoom(message.getConversationId(), "new_message", Map.of(
                "message", message,
                "conversationId", message.getConversationId()
        ));

        return ResponseEntity.ok(ApiResponse.ok("Message sent", message));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> editMessage(
            @PathVariable("id") String id,
            @RequestBody EditMessageRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.editMessage(id, principal.getId(), req.getContent());

        socketIOService.broadcastToRoom(message.getConversationId(), "message_edited", Map.of(
                "messageId", message.getId(),
                "conversationId", message.getConversationId(),
                "content", message.getContent(),
                "isEdited", true
        ));

        return ResponseEntity.ok(ApiResponse.ok("Message edited", message));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.deleteMessage(id, principal.getId());

        socketIOService.broadcastToRoom(message.getConversationId(), "message_deleted", Map.of(
                "messageId", message.getId(),
                "conversationId", message.getConversationId(),
                "forEveryone", true
        ));

        return ResponseEntity.ok(ApiResponse.ok("Message deleted", message));
    }

    @PostMapping("/{id}/react")
    public ResponseEntity<?> reactToMessage(
            @PathVariable("id") String id,
            @RequestBody ReactMessageRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.toggleReaction(id, principal.getId(), req.getEmoji());

        socketIOService.broadcastToRoom(message.getConversationId(), "reaction_updated", Map.of(
                "messageId", message.getId(),
                "conversationId", message.getConversationId(),
                "reactions", message.getReactions()
        ));

        return ResponseEntity.ok(ApiResponse.ok("Reaction updated", message));
    }

    @PostMapping("/{id}/star")
    public ResponseEntity<?> starMessage(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.toggleStar(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Star toggled", message));
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<?> pinMessage(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        Message message = messageService.togglePin(id);
        return ResponseEntity.ok(ApiResponse.ok("Pin toggled", message));
    }
}
