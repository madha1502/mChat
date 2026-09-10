package com.mchat.service;

import com.mchat.dto.MessageDTO.*;
import com.mchat.model.Conversation;
import com.mchat.model.Message;
import com.mchat.model.Message.ReactionItem;
import com.mchat.model.User;
import com.mchat.repository.ConversationRepository;
import com.mchat.repository.MessageRepository;
import com.mchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    public List<Message> getMessages(String conversationId, Instant before, int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit > 0 ? limit : 50);
        List<Message> messages;
        if (before != null) {
            messages = messageRepository.findByConversationIdBeforeCursor(conversationId, before, pageRequest);
        } else {
            messages = messageRepository.findLatestByConversationId(conversationId, pageRequest);
        }

        // Return in ascending chronological order for client display
        List<Message> reversed = new ArrayList<>(messages);
        Collections.reverse(reversed);
        return reversed;
    }

    public Message getMessageById(String id) {
        return messageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + id));
    }

    @Transactional
    public Message createMessage(String senderId, SendMessageRequest req) {
        // Prevent duplicate delivery via clientMessageId
        if (req.getClientMessageId() != null && !req.getClientMessageId().isBlank()) {
            Optional<Message> existing = messageRepository.findByClientMessageId(req.getClientMessageId());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        Conversation conv = conversationRepository.findById(req.getConversationId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        Message replyTo = null;
        if (req.getReplyTo() != null && !req.getReplyTo().isBlank()) {
            replyTo = messageRepository.findById(req.getReplyTo()).orElse(null);
        }

        Message.MessageBuilder builder = Message.builder()
                .clientMessageId(req.getClientMessageId() != null ? req.getClientMessageId() : UUID.randomUUID().toString())
                .conversationId(conv.getId())
                .sender(sender)
                .receiverId(req.getRecipientId())
                .messageType(req.getMessageType() != null ? req.getMessageType() : "text")
                .content(req.getContent())
                .mediaUrl(req.getMediaUrl())
                .mediaType(req.getMediaType())
                .fileName(req.getFileName())
                .fileSize(req.getFileSize())
                .replyTo(replyTo)
                .status("sent")
                .sentAt(Instant.now());

        if (req.getLocation() != null) {
            builder.locationLat((Double) req.getLocation().get("latitude"))
                    .locationLng((Double) req.getLocation().get("longitude"))
                    .locationName((String) req.getLocation().get("name"))
                    .locationAddress((String) req.getLocation().get("address"));
        }

        if (req.getContact() != null) {
            builder.contactName((String) req.getContact().get("name"))
                    .contactEmail((String) req.getContact().get("email"))
                    .contactUsername((String) req.getContact().get("username"))
                    .contactUserId((String) req.getContact().get("userId"));
        }

        // Handle disappearing message expiration
        if (conv.getDisappearingTimer() != null && conv.getDisappearingTimer() > 0) {
            builder.expiresAt(Instant.now().plus(conv.getDisappearingTimer(), ChronoUnit.SECONDS));
        }

        Message savedMessage = messageRepository.save(builder.build());

        // Update conversation last message & unread count
        conv.setLastMessage(savedMessage);
        conv.setLastMessageAt(savedMessage.getSentAt());

        // Increment unread count for other participants
        for (User p : conv.getParticipants()) {
            if (!p.getId().equals(senderId)) {
                int count = conv.getUnreadCounts().getOrDefault(p.getId(), 0);
                conv.getUnreadCounts().put(p.getId(), count + 1);
            }
        }
        conversationRepository.save(conv);

        return savedMessage;
    }

    @Transactional
    public Message editMessage(String messageId, String userId, String newContent) {
        Message msg = getMessageById(messageId);
        if (msg.getSender() == null || !msg.getSender().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the sender can edit this message");
        }
        if (Boolean.TRUE.equals(msg.getIsDeleted())) {
            throw new IllegalArgumentException("Cannot edit a deleted message");
        }

        msg.setContent(newContent);
        msg.setIsEdited(true);
        return messageRepository.save(msg);
    }

    @Transactional
    public Message deleteMessage(String messageId, String userId) {
        Message msg = getMessageById(messageId);
        if (msg.getSender() == null || !msg.getSender().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the sender can delete this message");
        }

        msg.setIsDeleted(true);
        msg.setContent("This message was deleted");
        msg.setMediaUrl(null);
        return messageRepository.save(msg);
    }

    @Transactional
    public Message toggleReaction(String messageId, String userId, String emoji) {
        Message msg = getMessageById(messageId);
        List<ReactionItem> reactions = msg.getReactions();

        // Check if user already reacted with this emoji
        Optional<ReactionItem> existing = reactions.stream()
                .filter(r -> r.getUser().equals(userId) && r.getEmoji().equals(emoji))
                .findFirst();

        if (existing.isPresent()) {
            reactions.remove(existing.get());
        } else {
            // Remove any other reaction from this user if present
            reactions.removeIf(r -> r.getUser().equals(userId));
            reactions.add(ReactionItem.builder().user(userId).emoji(emoji).createdAt(Instant.now()).build());
        }

        return messageRepository.save(msg);
    }

    @Transactional
    public Message toggleStar(String messageId, String userId) {
        Message msg = getMessageById(messageId);
        if (msg.getStarredBy().contains(userId)) {
            msg.getStarredBy().remove(userId);
        } else {
            msg.getStarredBy().add(userId);
        }
        return messageRepository.save(msg);
    }

    @Transactional
    public Message togglePin(String messageId) {
        Message msg = getMessageById(messageId);
        msg.setPinned(!Boolean.TRUE.equals(msg.getPinned()));
        return messageRepository.save(msg);
    }

    @Transactional
    public Message markDelivered(String messageId) {
        Message msg = getMessageById(messageId);
        if (!"read".equals(msg.getStatus())) {
            msg.setStatus("delivered");
            msg.setDeliveredAt(Instant.now());
            return messageRepository.save(msg);
        }
        return msg;
    }

    @Transactional
    public void markConversationRead(String conversationId, String readerId) {
        Conversation conv = conversationRepository.findById(conversationId).orElse(null);
        if (conv != null) {
            conv.getUnreadCounts().put(readerId, 0);
            conversationRepository.save(conv);
        }

        List<Message> unread = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        Instant now = Instant.now();
        for (Message m : unread) {
            if (m.getSender() != null && !m.getSender().getId().equals(readerId) && !"read".equals(m.getStatus())) {
                m.setStatus("read");
                m.setReadAt(now);
                messageRepository.save(m);
            }
        }
    }
}
