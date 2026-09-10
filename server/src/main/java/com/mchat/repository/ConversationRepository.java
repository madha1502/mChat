package com.mchat.repository;

import com.mchat.model.Conversation;
import com.mchat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {

    @Query("SELECT DISTINCT c FROM Conversation c JOIN c.participants p WHERE p.id = :userId ORDER BY c.lastMessageAt DESC")
    List<Conversation> findAllByParticipantId(@Param("userId") String userId);

    @Query("SELECT c FROM Conversation c JOIN c.participants p1 JOIN c.participants p2 " +
            "WHERE c.type = 'private' AND c.source = 'internal' " +
            "AND p1.id = :user1Id AND p2.id = :user2Id AND SIZE(c.participants) = 2")
    Optional<Conversation> findPrivateConversation(@Param("user1Id") String user1Id, @Param("user2Id") String user2Id);

    Optional<Conversation> findByGroupInviteToken(String token);

    Optional<Conversation> findByWaCustomerPhoneAndWaPhoneNumberId(String customerPhone, String phoneNumberId);
}
