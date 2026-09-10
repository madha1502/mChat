package com.mchat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MChatApplication {

    public static void main(String[] args) {
        SpringApplication.run(MChatApplication.class, args);
        System.out.println("=======================================================");
        System.out.println("🚀 mChat Java Spring Boot Server is running!");
        System.out.println("🌐 REST API URL: http://localhost:5000");
        System.out.println("🔌 Socket.IO Server: http://localhost:5001");
        System.out.println("📁 H2 Database Console: http://localhost:5000/h2-console");
        System.out.println("=======================================================");
    }
}
