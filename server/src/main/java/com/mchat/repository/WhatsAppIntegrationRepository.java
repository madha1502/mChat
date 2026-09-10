package com.mchat.repository;

import com.mchat.model.WhatsAppIntegration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WhatsAppIntegrationRepository extends JpaRepository<WhatsAppIntegration, String> {

    Optional<WhatsAppIntegration> findByUserId(String userId);

    Optional<WhatsAppIntegration> findByPhoneNumberId(String phoneNumberId);
}
