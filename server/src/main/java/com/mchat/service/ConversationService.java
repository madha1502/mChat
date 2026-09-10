package com.mchat.service;

import com.mchat.dto.ConversationDTO.*;
import com.mchat.model.Conversation;
import com.mchat.model.User;
import com.mchat.repository.ConversationRepository;
import com.mchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    public List<Map<String, Object>> getUserConversations(String userId) {
        List<Conversation> convs = conversationRepository.findAllByParticipantId(userId);

        List<Map<String, Object>> formatted = new ArrayList<>();
        for (Conversation c : convs) {
            Map<String, Object> map = new HashMap<>();
            map.put("_id", c.getId());
            map.put("type", c.getType());
            map.put("source", c.getSource());
            map.put("participants", c.getParticipants());
            map.put("group", c.getGroup());
            map.put("whatsappMetadata", c.getWhatsappMetadata());
            map.put("lastMessage", c.getLastMessage());
            map.put("lastMessageAt", c.getLastMessageAt());
            map.put("disappearingTimer", c.getDisappearingTimer());
            map.put("createdAt", c.getCreatedAt());
            map.put("updatedAt", c.getUpdatedAt());

            boolean isPinned = c.getPinnedBy().contains(userId);
            boolean isArchived = c.getArchivedBy().contains(userId);
            boolean isMuted = c.getMutedBy().contains(userId);
            int unread = c.getUnreadCounts().getOrDefault(userId, 0);

            map.put("isPinned", isPinned);
            map.put("isArchived", isArchived);
            map.put("isMuted", isMuted);
            map.put("unreadCount", unread);

            formatted.add(map);
        }

        // Sort: pinned first, then lastMessageAt descending
        formatted.sort((a, b) -> {
            boolean pA = Boolean.TRUE.equals(a.get("isPinned"));
            boolean pB = Boolean.TRUE.equals(b.get("isPinned"));
            if (pA && !pB) return -1;
            if (!pA && pB) return 1;

            Instant tA = (Instant) a.get("lastMessageAt");
            Instant tB = (Instant) b.get("lastMessageAt");
            if (tA == null) return 1;
            if (tB == null) return -1;
            return tB.compareTo(tA);
        });

        return formatted;
    }

    public Conversation getConversationById(String id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + id));
    }

    @Transactional
    public Conversation createConversation(String currentUserId, CreateConversationRequest req) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if ("private".equalsIgnoreCase(req.getType())) {
            if (req.getRecipientId() == null || req.getRecipientId().isBlank()) {
                throw new IllegalArgumentException("recipientId is required for private conversation");
            }
            User recipient = userRepository.findById(req.getRecipientId())
                    .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));

            // Check if private conversation already exists
            Optional<Conversation> existing = conversationRepository.findPrivateConversation(currentUserId, req.getRecipientId());
            if (existing.isPresent()) {
                return existing.get();
            }

            Conversation conv = Conversation.builder()
                    .type("private")
                    .source("internal")
                    .participants(new ArrayList<>(List.of(currentUser, recipient)))
                    .lastMessageAt(Instant.now())
                    .build();
            return conversationRepository.save(conv);
        } else {
            // Group conversation
            List<User> participants = new ArrayList<>();
            participants.add(currentUser);

            if (req.getMemberIds() != null) {
                for (String memberId : req.getMemberIds()) {
                    if (!memberId.equals(currentUserId)) {
                        userRepository.findById(memberId).ifPresent(participants::add);
                    }
                }
            }

            Set<String> adminIds = new HashSet<>();
            adminIds.add(currentUserId);

            Conversation group = Conversation.builder()
                    .type("group")
                    .source("internal")
                    .groupName(req.getName() != null && !req.getName().isBlank() ? req.getName() : "Group Chat")
                    .groupDescription(req.getDescription())
                    .groupImage(req.getImage() != null && !req.getImage().isBlank() ? req.getImage() :
                            "https://api.dicebear.com/7.x/identicon/svg?seed=" + UUID.randomUUID())
                    .groupCreatedBy(currentUserId)
                    .groupAdminIds(adminIds)
                    .groupInviteToken(UUID.randomUUID().toString().replace("-", "").substring(0, 16))
                    .participants(participants)
                    .lastMessageAt(Instant.now())
                    .build();

            return conversationRepository.save(group);
        }
    }

    @Transactional
    public Conversation updateGroup(String conversationId, String currentUserId, UpdateGroupRequest req) {
        Conversation conv = getConversationById(conversationId);
        if (!"group".equalsIgnoreCase(conv.getType())) {
            throw new IllegalArgumentException("Not a group conversation");
        }
        if (!conv.getGroupAdminIds().contains(currentUserId)) {
            throw new IllegalArgumentException("Only group admins can modify group settings");
        }

        if (req.getName() != null && !req.getName().isBlank()) conv.setGroupName(req.getName());
        if (req.getDescription() != null) conv.setGroupDescription(req.getDescription());
        if (req.getImage() != null && !req.getImage().isBlank()) conv.setGroupImage(req.getImage());

        return conversationRepository.save(conv);
    }

    @Transactional
    public Conversation addMembers(String conversationId, String currentUserId, List<String> memberIds) {
        Conversation conv = getConversationById(conversationId);
        if (!"group".equalsIgnoreCase(conv.getType())) {
            throw new IllegalArgumentException("Not a group conversation");
        }
        if (!conv.getGroupAdminIds().contains(currentUserId)) {
            throw new IllegalArgumentException("Only group admins can add members");
        }

        for (String id : memberIds) {
            boolean already = conv.getParticipants().stream().anyMatch(u -> u.getId().equals(id));
            if (!already) {
                userRepository.findById(id).ifPresent(conv.getParticipants()::add);
            }
        }
        return conversationRepository.save(conv);
    }

    @Transactional
    public Conversation removeMember(String conversationId, String currentUserId, String targetUserId) {
        Conversation conv = getConversationById(conversationId);
        if (!"group".equalsIgnoreCase(conv.getType())) {
            throw new IllegalArgumentException("Not a group conversation");
        }
        if (!currentUserId.equals(targetUserId) && !conv.getGroupAdminIds().contains(currentUserId)) {
            throw new IllegalArgumentException("Only group admins can remove members");
        }

        conv.getParticipants().removeIf(u -> u.getId().equals(targetUserId));
        conv.getGroupAdminIds().remove(targetUserId);

        return conversationRepository.save(conv);
    }

    @Transactional
    public String generateInviteToken(String conversationId, String currentUserId) {
        Conversation conv = getConversationById(conversationId);
        if (!conv.getGroupAdminIds().contains(currentUserId)) {
            throw new IllegalArgumentException("Only group admins can generate invite links");
        }
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        conv.setGroupInviteToken(token);
        conversationRepository.save(conv);
        return token;
    }

    @Transactional
    public Conversation joinGroupWithToken(String token, String currentUserId) {
        Conversation conv = conversationRepository.findByGroupInviteToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired invite link"));

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean already = conv.getParticipants().stream().anyMatch(u -> u.getId().equals(currentUserId));
        if (!already) {
            conv.getParticipants().add(user);
            conversationRepository.save(conv);
        }
        return conv;
    }

    @Transactional
    public boolean togglePin(String conversationId, String userId) {
        Conversation conv = getConversationById(conversationId);
        boolean isPinned;
        if (conv.getPinnedBy().contains(userId)) {
            conv.getPinnedBy().remove(userId);
            isPinned = false;
        } else {
            conv.getPinnedBy().add(userId);
            isPinned = true;
        }
        conversationRepository.save(conv);
        return isPinned;
    }

    @Transactional
    public boolean toggleArchive(String conversationId, String userId) {
        Conversation conv = getConversationById(conversationId);
        boolean isArchived;
        if (conv.getArchivedBy().contains(userId)) {
            conv.getArchivedBy().remove(userId);
            isArchived = false;
        } else {
            conv.getArchivedBy().add(userId);
            isArchived = true;
        }
        conversationRepository.save(conv);
        return isArchived;
    }

    @Transactional
    public boolean toggleMute(String conversationId, String userId) {
        Conversation conv = getConversationById(conversationId);
        boolean isMuted;
        if (conv.getMutedBy().contains(userId)) {
            conv.getMutedBy().remove(userId);
            isMuted = false;
        } else {
            conv.getMutedBy().add(userId);
            isMuted = true;
        }
        conversationRepository.save(conv);
        return isMuted;
    }

    @Transactional
    public Conversation setDisappearingTimer(String conversationId, String userId, Integer timerSeconds) {
        Conversation conv = getConversationById(conversationId);
        conv.setDisappearingTimer(timerSeconds != null ? timerSeconds : 0);
        return conversationRepository.save(conv);
    }

    @Transactional
    public void resetUnread(String conversationId, String userId) {
        Conversation conv = getConversationById(conversationId);
        conv.getUnreadCounts().put(userId, 0);
        conversationRepository.save(conv);
    }
}
