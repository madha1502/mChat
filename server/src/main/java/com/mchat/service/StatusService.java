package com.mchat.service;

import com.mchat.dto.StatusDTO.*;
import com.mchat.model.StatusStory;
import com.mchat.model.StatusStory.ViewerRecord;
import com.mchat.model.User;
import com.mchat.repository.StatusStoryRepository;
import com.mchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StatusService {

    private final StatusStoryRepository statusStoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public StatusStory createStatus(String userId, CreateStatusRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StatusStory story = StatusStory.builder()
                .user(user)
                .type(req.getType() != null ? req.getType() : "text")
                .content(req.getContent())
                .mediaUrl(req.getMediaUrl())
                .caption(req.getCaption())
                .backgroundColor(req.getBackgroundColor())
                .privacy(req.getPrivacy() != null ? req.getPrivacy() : "everyone")
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();

        return statusStoryRepository.save(story);
    }

    public List<StatusUserGroup> getFeed(String currentUserId) {
        List<StatusStory> activeStories = statusStoryRepository.findActiveStatuses(Instant.now());

        // Group stories by User
        Map<String, List<StatusStory>> grouped = new LinkedHashMap<>();
        Map<String, User> userMap = new HashMap<>();

        for (StatusStory s : activeStories) {
            String uid = s.getUser().getId();
            grouped.computeIfAbsent(uid, k -> new ArrayList<>()).add(s);
            userMap.put(uid, s.getUser());
        }

        List<StatusUserGroup> result = new ArrayList<>();
        for (Map.Entry<String, List<StatusStory>> entry : grouped.entrySet()) {
            User u = userMap.get(entry.getKey());
            List<StatusStory> stories = entry.getValue();

            boolean allViewed = stories.stream().allMatch(st ->
                    st.getViewers().stream().anyMatch(v -> v.getUserId().equals(currentUserId))
            );

            result.add(StatusUserGroup.builder()
                    .user(u)
                    .statuses(stories)
                    .allViewed(allViewed)
                    .build());
        }

        // Put current user's story group first, then unviewed, then viewed
        result.sort((a, b) -> {
            if (a.getUser().getId().equals(currentUserId)) return -1;
            if (b.getUser().getId().equals(currentUserId)) return 1;
            if (!a.isAllViewed() && b.isAllViewed()) return -1;
            if (a.isAllViewed() && !b.isAllViewed()) return 1;
            return 0;
        });

        return result;
    }

    @Transactional
    public StatusStory markViewed(String statusId, String viewerUserId) {
        StatusStory story = statusStoryRepository.findById(statusId)
                .orElseThrow(() -> new IllegalArgumentException("Status story not found: " + statusId));

        User viewer = userRepository.findById(viewerUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean alreadyViewed = story.getViewers().stream()
                .anyMatch(v -> v.getUserId().equals(viewerUserId));

        if (!alreadyViewed && !story.getUser().getId().equals(viewerUserId)) {
            story.getViewers().add(ViewerRecord.builder()
                    .userId(viewer.getId())
                    .userName(viewer.getName())
                    .userPicture(viewer.getProfilePicture())
                    .viewedAt(Instant.now())
                    .build());
            return statusStoryRepository.save(story);
        }

        return story;
    }

    @Transactional
    public void deleteStatus(String statusId, String userId) {
        StatusStory story = statusStoryRepository.findById(statusId)
                .orElseThrow(() -> new IllegalArgumentException("Status story not found"));

        if (!story.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Only the author can delete this status");
        }

        statusStoryRepository.delete(story);
    }
}
