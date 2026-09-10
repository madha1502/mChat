package com.mchat.service;

import com.mchat.dto.CallDTO.*;
import com.mchat.model.CallLog;
import com.mchat.model.User;
import com.mchat.repository.CallLogRepository;
import com.mchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CallService {

    private final CallLogRepository callLogRepository;
    private final UserRepository userRepository;

    public List<CallLog> getCallHistory(String userId) {
        return callLogRepository.findUserCallHistory(userId);
    }

    @Transactional
    public CallLog logCall(String callerId, LogCallRequest req) {
        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new IllegalArgumentException("Caller not found"));

        User receiver = userRepository.findById(req.getReceiverId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        CallLog log = CallLog.builder()
                .caller(caller)
                .receiver(receiver)
                .type(req.getType() != null ? req.getType() : "audio")
                .status(req.getStatus() != null ? req.getStatus() : "ringing")
                .duration(req.getDuration())
                .startedAt(Instant.now())
                .build();

        return callLogRepository.save(log);
    }
}
