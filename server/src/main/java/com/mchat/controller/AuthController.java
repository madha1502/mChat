package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.dto.AuthDTO.*;
import com.mchat.security.UserPrincipal;
import com.mchat.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        String email = authService.sendOtp(req.getEmail(), req.getPurpose(), req.getName());
        return ResponseEntity.ok(ApiResponse.ok("6-digit verification code sent to " + email, Map.of("email", email)));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        authService.verifyOtp(req.getEmail(), req.getOtp(), req.getPurpose());
        return ResponseEntity.ok(ApiResponse.ok("OTP verified successfully", null));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req, HttpServletResponse response) {
        AuthResponse auth = authService.register(req);
        attachTokenCookie(response, auth.getToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Account registered successfully 💖", auth));
    }

    @PostMapping("/login-init")
    public ResponseEntity<?> initiateLogin(@Valid @RequestBody LoginInitRequest req) {
        String email = authService.initiateLogin(req.getIdentifier(), req.getPassword());
        return ResponseEntity.ok(ApiResponse.ok(
                "Verification code sent to your Gmail (" + email + ")",
                Map.of("email", email, "requireOtp", true)
        ));
    }

    @PostMapping("/login-otp")
    public ResponseEntity<?> completeLoginWithOtp(@Valid @RequestBody LoginOtpRequest req, HttpServletResponse response) {
        AuthResponse auth = authService.completeLoginWithOtp(req.getEmail(), req.getOtp());
        attachTokenCookie(response, auth.getToken());
        return ResponseEntity.ok(ApiResponse.ok("Signed in successfully 💖", auth));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletResponse response) {
        AuthResponse auth = authService.login(req.getIdentifier(), req.getPassword());
        attachTokenCookie(response, auth.getToken());
        return ResponseEntity.ok(ApiResponse.ok("Signed in successfully", auth));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleLoginRequest req, HttpServletResponse response) {
        AuthResponse auth = authService.googleLogin(req.getIdToken());
        attachTokenCookie(response, auth.getToken());
        return ResponseEntity.ok(ApiResponse.ok("Authenticated successfully with Google", auth));
    }

    @PostMapping("/dev-login")
    public ResponseEntity<?> devLogin(@RequestBody(required = false) Map<String, String> body, HttpServletResponse response) {
        String persona = body != null ? body.get("persona") : "Alice";
        AuthResponse auth = authService.devLogin(persona);
        attachTokenCookie(response, auth.getToken());
        return ResponseEntity.ok(ApiResponse.ok("Logged in as dev persona " + persona, auth));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Not authenticated"));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("user", principal.getUser())));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("token", "");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }

    private void attachTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("token", token);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(cookie);
    }
}
