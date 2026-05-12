package com.schoolers.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.logging.Logger;

@Service
public class EmailService {

    private static final Logger log = Logger.getLogger(EmailService.class.getName());

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("my-skoolz Password Reset OTP");
        message.setText(
            "Dear User,\n\n" +
            "Your OTP for password reset is: " + otp + "\n\n" +
            "This OTP is valid for 5 minutes. Do not share it with anyone.\n\n" +
            "If you did not request a password reset, please ignore this email.\n\n" +
            "Regards,\nmy-skoolz Team"
        );
        mailSender.send(message);
        log.info("[EmailService] OTP email sent to: " + toEmail);
    }
}
