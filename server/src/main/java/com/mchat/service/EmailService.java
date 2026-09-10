package com.mchat.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    public void sendOtpEmail(String toEmail, String otp, String name, String purpose) {
        log.info("=================================================");
        log.info("📧 [mChat OTP 2FA Code]: {}", otp);
        log.info("🎯 Recipient: {} ({}) | Purpose: {}", name != null ? name : "User", toEmail, purpose);
        log.info("=================================================");

        if (smtpUser == null || smtpUser.isBlank() || smtpUser.equalsIgnoreCase("null")) {
            log.info("ℹ️ SMTP credentials not configured. OTP printed to server console above for development convenience.");
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(smtpUser, "mChat Security");
            helper.setTo(toEmail);
            helper.setSubject("Your mChat Verification Code: " + otp);

            String html = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #6366f1; margin: 0; font-size: 28px;">mChat</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Unified Real-Time Messaging Platform</p>
                    </div>
                    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                        <p style="color: #334155; font-size: 16px; margin: 0 0 16px 0;">Your 6-digit verification code is:</p>
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #ede9fe; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                            %s
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px; margin-bottom: 0;">Valid for 10 minutes. Never share this code with anyone.</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">If you did not request this verification code, please ignore this email.</p>
                </div>
            """.formatted(otp);

            helper.setText(html, true);
            mailSender.send(mimeMessage);
            log.info("✅ Verification email successfully sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Could not send SMTP email to {}: {}", toEmail, e.getMessage());
        }
    }
}
