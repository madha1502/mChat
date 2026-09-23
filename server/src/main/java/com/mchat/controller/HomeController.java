package com.mchat.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public ResponseEntity<?> index() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "app", "mChat Java Spring Boot Backend Server",
                "version", "1.0.0",
                "socketPort", 5001,
                "h2Console", "/h2-console"
        ));
    }
}
