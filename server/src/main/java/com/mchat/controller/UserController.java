package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.UserDTO.*;
import com.mchat.model.User;
import com.mchat.security.UserPrincipal;
import com.mchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam(value = "query", defaultValue = "") String query,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<User> results = userService.searchUsers(query, principal != null ? principal.getId() : null);
        return ResponseEntity.ok(ApiResponse.ok(results));
    }

    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(
            @RequestBody UpdateProfileRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        User updated = userService.updateProfile(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated successfully", updated));
    }

    @PatchMapping("/me/privacy")
    public ResponseEntity<?> updatePrivacy(
            @RequestBody UpdatePrivacyRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        User updated = userService.updatePrivacy(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Privacy settings updated", updated.getPrivacySettings()));
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<?> blockUser(
            @PathVariable("id") String targetId,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.blockUser(principal.getId(), targetId);
        return ResponseEntity.ok(ApiResponse.ok("User blocked successfully", user));
    }

    @DeleteMapping("/{id}/block")
    public ResponseEntity<?> unblockUser(
            @PathVariable("id") String targetId,
            @AuthenticationPrincipal UserPrincipal principal) {

        User user = userService.unblockUser(principal.getId(), targetId);
        return ResponseEntity.ok(ApiResponse.ok("User unblocked successfully", user));
    }
}
