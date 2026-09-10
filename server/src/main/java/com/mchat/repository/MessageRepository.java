package com.mchat.repository;

import com.mchat.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.createdAt DESC")
    List<Message> findLatestByConversationId(@Param("conversationId") String conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.createdAt < :before ORDER BY m.createdAt DESC")
    List<Message> findByConversationIdBeforeCursor(@Param("conversationId") String conversationId, @Param("before") Instant before, Pageable pageable);

    Optional<Message> findByClientMessageId(String clientMessageId);

    Optional<Message> findByWhatsappMessageId(String whatsappMessageId);
}
