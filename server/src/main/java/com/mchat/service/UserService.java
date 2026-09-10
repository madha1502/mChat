package com.mchat.service;

import com.mchat.dto.UserDTO.*;
import com.mchat.model.User;
import com.mchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> searchUsers(String query, String currentUserId) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        return userRepository.searchUsers(query.trim()).stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .toList();
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    @Transactional
    public User updateProfile(String userId, UpdateProfileRequest req) {
        User user = getUserById(userId);

        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName().trim());
        }
        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            String cleanUsername = req.getUsername().toLowerCase().trim();
            if (!cleanUsername.equals(user.getUsername()) && userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
                throw new IllegalArgumentException("Username already in use");
            }
            user.setUsername(cleanUsername);
        }
        if (req.getAbout() != null) {
            user.setAbout(req.getAbout().trim());
        }
        if (req.getProfilePicture() != null && !req.getProfilePicture().isBlank()) {
            user.setProfilePicture(req.getProfilePicture());
        }

        return userRepository.save(user);
    }

    @Transactional
    public User updatePrivacy(String userId, UpdatePrivacyRequest req) {
        User user = getUserById(userId);

        if (req.getLastSeen() != null) user.setPrivacyLastSeen(req.getLastSeen());
        if (req.getProfilePicture() != null) user.setPrivacyProfilePicture(req.getProfilePicture());
        if (req.getAbout() != null) user.setPrivacyAbout(req.getAbout());
        if (req.getStatus() != null) user.setPrivacyStatus(req.getStatus());
        if (req.getReadReceipts() != null) user.setPrivacyReadReceipts(req.getReadReceipts());
        if (req.getTypingIndicator() != null) user.setPrivacyTypingIndicator(req.getTypingIndicator());

        return userRepository.save(user);
    }

    @Transactional
    public void setOnlineStatus(String userId, boolean isOnline) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsOnline(isOnline);
            user.setLastSeen(Instant.now());
            userRepository.save(user);
        });
    }

    @Transactional
    public User blockUser(String currentUserId, String targetUserId) {
        User user = getUserById(currentUserId);
        user.getBlockedUsers().add(targetUserId);
        return userRepository.save(user);
    }

    @Transactional
    public User unblockUser(String currentUserId, String targetUserId) {
        User user = getUserById(currentUserId);
        user.getBlockedUsers().remove(targetUserId);
        return userRepository.save(user);
    }
}
