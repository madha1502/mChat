package com.mchat.repository;

import com.mchat.model.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {

    Optional<OtpToken> findTopByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(String email, String purpose);

    Optional<OtpToken> findTopByEmailIgnoreCaseAndOtpAndPurposeOrderByCreatedAtDesc(String email, String otp, String purpose);

    void deleteByEmailIgnoreCaseAndPurpose(String email, String purpose);
}
