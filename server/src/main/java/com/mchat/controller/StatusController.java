package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.StatusDTO.*;
import com.mchat.model.StatusStory;
import com.mchat.security.UserPrincipal;
import com.mchat.service.StatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/statuses")
@RequiredArgsConstructor
public class StatusController {

    private final StatusService statusService;

    @GetMapping("/feed")
    public ResponseEntity<?> getFeed(@AuthenticationPrincipal UserPrincipal principal) {
        List<StatusUserGroup> feed = statusService.getFeed(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(feed));
    }

    @PostMapping
    public ResponseEntity<?> createStatus(
            @RequestBody CreateStatusRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        StatusStory story = statusService.createStatus(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Status created", story));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<?> markViewed(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        StatusStory story = statusService.markViewed(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Status viewed", story));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStatus(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        statusService.deleteStatus(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.ok("Status deleted", null));
    }
}
