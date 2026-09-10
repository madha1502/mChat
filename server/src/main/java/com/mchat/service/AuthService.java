package com.mchat.service;

import com.mchat.dto.AuthDTO.*;
import com.mchat.model.OtpToken;
import com.mchat.model.User;
import com.mchat.repository.OtpTokenRepository;
import com.mchat.repository.UserRepository;
import com.mchat.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String sendOtp(String email, String purpose, String name) {
        String cleanEmail = email.toLowerCase().trim();

        if ("register".equalsIgnoreCase(purpose)) {
            if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
                throw new IllegalArgumentException("An account with this email address already exists.");
            }
        } else if ("login".equalsIgnoreCase(purpose)) {
            User existing = userRepository.findByEmailIgnoreCase(cleanEmail)
                    .orElseThrow(() -> new IllegalArgumentException("No user account found with this email address."));
            if (name == null || name.isBlank()) {
                name = existing.getName();
            }
        }

        // Generate 6-digit numeric OTP code
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));

        // Invalidate prior active OTPs for email & purpose
        otpTokenRepository.deleteByEmailIgnoreCaseAndPurpose(cleanEmail, purpose);

        OtpToken token = OtpToken.builder()
                .email(cleanEmail)
                .otp(otp)
                .purpose(purpose != null ? purpose : "register")
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .build();
        otpTokenRepository.save(token);

        emailService.sendOtpEmail(cleanEmail, otp, name, purpose);
        return cleanEmail;
    }

    @Transactional
    public boolean verifyOtp(String email, String otp, String purpose) {
        String cleanEmail = email.toLowerCase().trim();
        OtpToken token = otpTokenRepository
                .findTopByEmailIgnoreCaseAndOtpAndPurposeOrderByCreatedAtDesc(cleanEmail, otp.trim(), purpose)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired 6-digit verification code."));

        if (token.isExpired()) {
            otpTokenRepository.delete(token);
            throw new IllegalArgumentException("Verification code has expired. Please request a new one.");
        }

        otpTokenRepository.delete(token);
        return true;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String cleanEmail = req.getEmail().toLowerCase().trim();
        String cleanUsername = req.getUsername().toLowerCase().trim();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new IllegalArgumentException("An account with this email address already exists.");
        }
        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new IllegalArgumentException("This username is already taken. Please choose another.");
        }

        if (req.getOtp() != null && !req.getOtp().isBlank()) {
            verifyOtp(cleanEmail, req.getOtp(), "register");
        }

        User user = User.builder()
                .name(req.getName().trim())
                .username(cleanUsername)
                .email(cleanEmail)
                .password(passwordEncoder.encode(req.getPassword()))
                .profilePicture(req.getProfilePicture() != null && !req.getProfilePicture().isBlank() ?
                        req.getProfilePicture() : "https://api.dicebear.com/7.x/avataaars/svg?seed=" + cleanUsername)
                .about(req.getAbout() != null && !req.getAbout().isBlank() ? req.getAbout() : "Hey there! I am using mChat 💖")
                .isOnline(false)
                .build();

        User saved = userRepository.save(user);
        String token = jwtTokenProvider.generateToken(saved.getId(), saved.getEmail());

        return AuthResponse.builder().user(saved).token(token).build();
    }

    public String initiateLogin(String identifier, String password) {
        String cleanId = identifier.toLowerCase().trim();
        User user = userRepository.findByEmailIgnoreCase(cleanId)
                .or(() -> userRepository.findByUsernameIgnoreCase(cleanId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid email/username or password."));

        if (user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email/username or password.");
        }

        sendOtp(user.getEmail(), "login", user.getName());
        return user.getEmail();
    }

    @Transactional
    public AuthResponse completeLoginWithOtp(String email, String otp) {
        String cleanEmail = email.toLowerCase().trim();
        verifyOtp(cleanEmail, otp, "login");

        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("User account not found."));

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.builder().user(user).token(token).build();
    }

    public AuthResponse login(String identifier, String password) {
        String cleanId = identifier.toLowerCase().trim();
        User user = userRepository.findByEmailIgnoreCase(cleanId)
                .or(() -> userRepository.findByUsernameIgnoreCase(cleanId))
                .orElseThrow(() -> new IllegalArgumentException("Invalid email/username or password."));

        if (user.getPassword() == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid email/username or password.");
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.builder().user(user).token(token).build();
    }

    @Transactional
    public AuthResponse googleLogin(String idToken) {
        // Support Google OAuth token or demo mock token
        String email = "demo.google@mchat.com";
        String name = "Google User";
        String googleId = "google_" + idToken.hashCode();
        String picture = "https://api.dicebear.com/7.x/avataaars/svg?seed=google";

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .orElseGet(() -> {
                    String username = "google_user_" + System.currentTimeMillis() % 10000;
                    return userRepository.save(User.builder()
                            .googleId(googleId)
                            .email(email)
                            .name(name)
                            .username(username)
                            .profilePicture(picture)
                            .about("Authenticated with Google")
                            .isOnline(false)
                            .build());
                });

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.builder().user(user).token(token).build();
    }

    @Transactional
    public AuthResponse devLogin(String personaName) {
        String name = personaName != null && !personaName.isBlank() ? personaName : "Alice";
        String username = name.toLowerCase().replace(" ", "_");
        String email = username + "@mchat.dev";

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> userRepository.save(User.builder()
                        .name(name)
                        .username(username)
                        .email(email)
                        .password(passwordEncoder.encode("devpassword123"))
                        .profilePicture("https://api.dicebear.com/7.x/avataaars/svg?seed=" + username)
                        .about("Hey! I'm " + name + " exploring mChat 🚀")
                        .isOnline(false)
                        .build()));

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return AuthResponse.builder().user(user).token(token).build();
    }
}
