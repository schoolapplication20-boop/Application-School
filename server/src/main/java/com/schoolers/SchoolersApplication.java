package com.schoolers;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SchoolersApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchoolersApplication.class, args);
        String port = System.getenv("PORT") != null ? System.getenv("PORT") : "8080";
        System.out.println("======================================");
        System.out.println("  Schoolers Backend Started!");
        System.out.println("  Running on: http://localhost:" + port);
        System.out.println("======================================");
    }
}
