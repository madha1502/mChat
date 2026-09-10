package com.mchat.repository;

import com.mchat.model.StatusStory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface StatusStoryRepository extends JpaRepository<StatusStory, String> {

    @Query("SELECT s FROM StatusStory s WHERE s.expiresAt > :now ORDER BY s.createdAt DESC")
    List<StatusStory> findActiveStatuses(@Param("now") Instant now);

    List<StatusStory> findByUserIdAndExpiresAtGreaterThanOrderByCreatedAtDesc(String userId, Instant now);
}
