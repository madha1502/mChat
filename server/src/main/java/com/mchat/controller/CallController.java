package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.CallDTO.*;
import com.mchat.model.CallLog;
import com.mchat.security.UserPrincipal;
import com.mchat.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @GetMapping("/history")
    public ResponseEntity<?> getCallHistory(@AuthenticationPrincipal UserPrincipal principal) {
        List<CallLog> history = callService.getCallHistory(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    @PostMapping("/log")
    public ResponseEntity<?> logCall(
            @RequestBody LogCallRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        CallLog log = callService.logCall(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok("Call logged", log));
    }
}
