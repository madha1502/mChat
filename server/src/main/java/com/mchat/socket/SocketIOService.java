package com.mchat.socket;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.listener.ConnectListener;
import com.corundumstudio.socketio.listener.DataListener;
import com.corundumstudio.socketio.listener.DisconnectListener;
import com.mchat.dto.MessageDTO.SendMessageRequest;
import com.mchat.model.Message;
import com.mchat.model.User;
import com.mchat.security.JwtTokenProvider;
import com.mchat.service.MessageService;
import com.mchat.service.UserService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class SocketIOService {

    private static final Logger log = LoggerFactory.getLogger(SocketIOService.class);

    private final SocketIOServer server;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final MessageService messageService;

    // Maps: userId -> set of active SocketIOClient sessions
    private final Map<String, Set<SocketIOClient>> userSockets = new ConcurrentHashMap<>();
    // Client sessionId -> userId
    private final Map<UUID, String> sessionUsers = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() {
        server.addConnectListener(onConnected());
        server.addDisconnectListener(onDisconnected());

        registerRoomListeners();
        registerChatListeners();
        registerTypingListeners();
        registerWebRtcListeners();

        try {
            server.start();
            log.info("🔌 Netty-SocketIO Server successfully started on port {}", server.getConfiguration().getPort());
        } catch (Exception e) {
            log.error("Failed to start Netty-SocketIO server: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void stop() {
        try {
            server.stop();
            log.info("Netty-SocketIO Server stopped.");
        } catch (Exception e) {
            log.error("Error stopping Netty-SocketIO server: {}", e.getMessage());
        }
    }

    private ConnectListener onConnected() {
        return client -> {
            try {
                String token = client.getHandshakeData().getSingleUrlParam("token");
                if (token == null || token.isBlank()) {
                    // Try auth map or headers
                    Object authObj = client.getHandshakeData().getHttpHeaders().get("Authorization");
                    if (authObj != null) {
                        String authStr = authObj.toString();
                        if (authStr.startsWith("Bearer ")) {
                            token = authStr.substring(7);
                        }
                    }
                }

                String userId = null;
                if (token != null && tokenProvider.validateToken(token)) {
                    userId = tokenProvider.getUserIdFromToken(token);
                }

                if (userId != null) {
                    sessionUsers.put(client.getSessionId(), userId);
                    userSockets.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(client);

                    userService.setOnlineStatus(userId, true);
                    broadcastPresence(userId, true);
                    broadcastOnlineCount();
                    log.info("🟢 User connected: {} (Socket ID: {})", userId, client.getSessionId());
                } else {
                    log.info("Anonymous socket connected: {}", client.getSessionId());
                }
            } catch (Exception e) {
                log.warn("Socket connect error: {}", e.getMessage());
            }
        };
    }

    private DisconnectListener onDisconnected() {
        return client -> {
            try {
                UUID sessionId = client.getSessionId();
                String userId = sessionUsers.remove(sessionId);

                if (userId != null) {
                    Set<SocketIOClient> sockets = userSockets.get(userId);
                    if (sockets != null) {
                        sockets.remove(client);
                        if (sockets.isEmpty()) {
                            userSockets.remove(userId);
                            userService.setOnlineStatus(userId, false);
                            broadcastPresence(userId, false);
                            broadcastOnlineCount();
                            log.info("🔴 User went offline: {}", userId);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Socket disconnect error: {}", e.getMessage());
            }
        };
    }

    private void registerRoomListeners() {
        server.addEventListener("join_conversation", String.class, (client, conversationId, ackRequest) -> {
            client.joinRoom(conversationId);
            log.info("Socket {} joined room {}", client.getSessionId(), conversationId);
        });

        server.addEventListener("leave_conversation", String.class, (client, conversationId, ackRequest) -> {
            client.leaveRoom(conversationId);
            log.info("Socket {} left room {}", client.getSessionId(), conversationId);
        });
    }

    private void registerChatListeners() {
        server.addEventListener("send_message", Map.class, (client, data, ackRequest) -> {
            String userId = sessionUsers.get(client.getSessionId());
            if (userId == null) return;

            try {
                SendMessageRequest req = new SendMessageRequest();
                req.setClientMessageId((String) data.get("clientMessageId"));
                req.setConversationId((String) data.get("conversationId"));
                req.setRecipientId((String) data.get("recipientId"));
                req.setMessageType((String) data.getOrDefault("messageType", "text"));
                req.setContent((String) data.get("content"));
                req.setMediaUrl((String) data.get("mediaUrl"));
                req.setReplyTo((String) data.get("replyTo"));

                Message message = messageService.createMessage(userId, req);

                // Broadcast new message to conversation room
                Map<String, Object> payload = new HashMap<>();
                payload.put("message", message);
                payload.put("conversationId", message.getConversationId());

                server.getRoomOperations(message.getConversationId()).sendEvent("new_message", payload);

                if (ackRequest.isAckRequested()) {
                    ackRequest.sendAckData(Map.of("success", true, "data", message));
                }
            } catch (Exception e) {
                log.error("Error sending socket message: {}", e.getMessage());
                if (ackRequest.isAckRequested()) {
                    ackRequest.sendAckData(Map.of("success", false, "message", e.getMessage()));
                }
            }
        });

        server.addEventListener("message_delivered", Map.class, (client, data, ackRequest) -> {
            String messageId = (String) data.get("messageId");
            String conversationId = (String) data.get("conversationId");
            if (messageId != null) {
                messageService.markDelivered(messageId);
                server.getRoomOperations(conversationId).sendEvent("message_delivered", data);
            }
        });

        server.addEventListener("message_read", Map.class, (client, data, ackRequest) -> {
            String conversationId = (String) data.get("conversationId");
            String readerId = sessionUsers.get(client.getSessionId());
            if (conversationId != null && readerId != null) {
                messageService.markConversationRead(conversationId, readerId);
                Map<String, Object> payload = new HashMap<>(data);
                payload.put("readerId", readerId);
                payload.put("readAt", Instant.now().toString());
                server.getRoomOperations(conversationId).sendEvent("message_read", payload);
            }
        });
    }

    private void registerTypingListeners() {
        server.addEventListener("typing", Map.class, (client, data, ackRequest) -> {
            String userId = sessionUsers.get(client.getSessionId());
            if (userId == null) return;
            String conversationId = (String) data.get("conversationId");

            User u = userService.getUserById(userId);
            Map<String, Object> payload = new HashMap<>();
            payload.put("conversationId", conversationId);
            payload.put("userId", userId);
            payload.put("userName", u.getName());

            // Broadcast to all clients in conversation room except the sender
            for (SocketIOClient c : server.getRoomOperations(conversationId).getClients()) {
                if (!c.getSessionId().equals(client.getSessionId())) {
                    c.sendEvent("user_typing", payload);
                }
            }
        });

        server.addEventListener("stop_typing", Map.class, (client, data, ackRequest) -> {
            String userId = sessionUsers.get(client.getSessionId());
            if (userId == null) return;
            String conversationId = (String) data.get("conversationId");

            Map<String, Object> payload = new HashMap<>();
            payload.put("conversationId", conversationId);
            payload.put("userId", userId);

            for (SocketIOClient c : server.getRoomOperations(conversationId).getClients()) {
                if (!c.getSessionId().equals(client.getSessionId())) {
                    c.sendEvent("user_stop_typing", payload);
                }
            }
        });
    }

    private void registerWebRtcListeners() {
        // 1. Call User (Offer)
        server.addEventListener("call_user", Map.class, (client, data, ackRequest) -> {
            String callerId = sessionUsers.get(client.getSessionId());
            String targetUserId = (String) data.get("targetUserId");
            if (callerId == null || targetUserId == null) return;

            User caller = userService.getUserById(callerId);
            Map<String, Object> payload = new HashMap<>(data);
            payload.put("caller", caller);
            payload.put("callId", data.getOrDefault("callId", UUID.randomUUID().toString()));

            sendToUser(targetUserId, "incoming_call", payload);
        });

        // 2. Answer Call
        server.addEventListener("answer_call", Map.class, (client, data, ackRequest) -> {
            String callerId = (String) data.get("callerId");
            if (callerId != null) {
                sendToUser(callerId, "call_accepted", data);
            }
        });

        // 3. Reject Call
        server.addEventListener("reject_call", Map.class, (client, data, ackRequest) -> {
            String callerId = (String) data.get("callerId");
            if (callerId != null) {
                sendToUser(callerId, "call_rejected", data);
            }
        });

        // 4. ICE Candidate Exchange
        server.addEventListener("ice_candidate", Map.class, (client, data, ackRequest) -> {
            String targetUserId = (String) data.get("targetUserId");
            if (targetUserId != null) {
                sendToUser(targetUserId, "ice_candidate", data);
            }
        });

        // 5. End Call
        server.addEventListener("end_call", Map.class, (client, data, ackRequest) -> {
            String targetUserId = (String) data.get("targetUserId");
            if (targetUserId != null) {
                sendToUser(targetUserId, "call_ended", data);
            }
        });
    }

    public void sendToUser(String userId, String event, Object data) {
        Set<SocketIOClient> sockets = userSockets.get(userId);
        if (sockets != null) {
            for (SocketIOClient client : sockets) {
                client.sendEvent(event, data);
            }
        }
    }

    public void broadcastToRoom(String room, String event, Object data) {
        server.getRoomOperations(room).sendEvent(event, data);
    }

    public void broadcastPresence(String userId, boolean isOnline) {
        Map<String, Object> data = new HashMap<>();
        data.put("userId", userId);
        data.put("isOnline", isOnline);
        data.put("lastSeen", Instant.now().toString());
        server.getBroadcastOperations().sendEvent("user_presence_change", data);
    }

    public void broadcastOnlineCount() {
        int count = userSockets.size();
        server.getBroadcastOperations().sendEvent("online_count_update", Map.of("count", count));
    }
}
