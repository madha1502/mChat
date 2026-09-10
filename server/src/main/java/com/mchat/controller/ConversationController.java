package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.ConversationDTO.*;
import com.mchat.model.Conversation;
import com.mchat.security.UserPrincipal;
import com.mchat.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @GetMapping
    public ResponseEntity<?> getConversations(@AuthenticationPrincipal UserPrincipal principal) {
        List<Map<String, Object>> convs = conversationService.getUserConversations(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(convs));
    }

    @PostMapping
    public ResponseEntity<?> createConversation(
            @RequestBody CreateConversationRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.createConversation(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Conversation created", conv));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getConversationById(@PathVariable("id") String id) {
        Conversation conv = conversationService.getConversationById(id);
        return ResponseEntity.ok(ApiResponse.ok(conv));
    }

    @PatchMapping("/{id}/group")
    public ResponseEntity<?> updateGroup(
            @PathVariable("id") String id,
            @RequestBody UpdateGroupRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.updateGroup(id, principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Group updated", conv));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<?> addMembers(
            @PathVariable("id") String id,
            @RequestBody AddMembersRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.addMembers(id, principal.getId(), req.getMemberIds());
        return ResponseEntity.ok(ApiResponse.ok("Members added", conv));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<?> removeMember(
            @PathVariable("id") String id,
            @PathVariable("memberId") String memberId,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.removeMember(id, principal.getId(), memberId);
        return ResponseEntity.ok(ApiResponse.ok("Member removed", conv));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<?> generateInviteLink(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        String token = conversationService.generateInviteToken(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("inviteToken", token, "inviteLink", "/join/" + token)));
    }

    @PostMapping("/join/{token}")
    public ResponseEntity<?> joinWithToken(
            @PathVariable("token") String token,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.joinGroupWithToken(token, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Joined group successfully", conv));
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<?> togglePin(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean pinned = conversationService.togglePin(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("isPinned", pinned)));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<?> toggleArchive(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean archived = conversationService.toggleArchive(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("isArchived", archived)));
    }

    @PostMapping("/{id}/mute")
    public ResponseEntity<?> toggleMute(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean muted = conversationService.toggleMute(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("isMuted", muted)));
    }

    @PatchMapping("/{id}/disappearing")
    public ResponseEntity<?> setDisappearingTimer(
            @PathVariable("id") String id,
            @RequestBody DisappearingTimerRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        Conversation conv = conversationService.setDisappearingTimer(id, principal.getId(), req.getDisappearingTimer());
        return ResponseEntity.ok(ApiResponse.ok("Disappearing timer updated", conv));
    }
}
