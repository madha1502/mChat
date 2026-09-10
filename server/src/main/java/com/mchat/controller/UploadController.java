package com.mchat.controller;

import com.mchat.dto.ApiResponse;
import com.mchat.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final StorageService storageService;

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("No file provided"));
        }

        String fileUrl = storageService.storeFile(file);

        Map<String, Object> data = new HashMap<>();
        data.put("url", fileUrl);
        data.put("filename", file.getOriginalFilename());
        data.put("mimetype", file.getContentType());
        data.put("size", file.getSize());

        return ResponseEntity.ok(ApiResponse.ok("File uploaded successfully", data));
    }
}
