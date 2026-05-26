package com.schoolers;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SchoolersApplication {

    public static void main(String[] args) {
        SpringApplication.run(SchoolersApplication.class, args);
    }
}
