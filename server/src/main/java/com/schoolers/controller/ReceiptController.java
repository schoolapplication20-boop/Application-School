package com.schoolers.controller;

import com.schoolers.model.FeePayment;
import com.schoolers.model.School;
import com.schoolers.repository.FeePaymentRepository;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.service.ReceiptTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;

/**
 * No-login receipt view, linked from the WhatsApp receipt-link message. Public (see
 * {@code SecurityConfig}'s permitAll for this exact path) — access is gated by a signed,
 * time-limited token instead of authentication, since the parent opens this straight from WhatsApp.
 */
@RestController
public class ReceiptController {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final FeePaymentRepository feePaymentRepository;
    private final SchoolRepository schoolRepository;
    private final ReceiptTokenService tokenService;

    public ReceiptController(FeePaymentRepository feePaymentRepository,
                              SchoolRepository schoolRepository,
                              ReceiptTokenService tokenService) {
        this.feePaymentRepository = feePaymentRepository;
        this.schoolRepository = schoolRepository;
        this.tokenService = tokenService;
    }

    @GetMapping(value = "/api/receipts/{feePaymentId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> viewReceipt(@PathVariable Long feePaymentId, @RequestParam String token) {
        if (!tokenService.validate(feePaymentId, token)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorPage("This receipt link is invalid or has expired."));
        }

        FeePayment payment = feePaymentRepository.findById(feePaymentId).orElse(null);
        if (payment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorPage("Receipt not found."));
        }

        String schoolName = payment.getSchoolId() != null
                ? schoolRepository.findById(payment.getSchoolId()).map(School::getName).orElse("My-Skoolz")
                : "My-Skoolz";

        return ResponseEntity.ok(renderReceipt(schoolName, payment));
    }

    private String renderReceipt(String schoolName, FeePayment p) {
        return "<!doctype html><html><head><meta charset=\"utf-8\">" +
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
                "<title>Fee Receipt - " + escape(p.getReceiptNumber()) + "</title>" +
                "<style>" +
                "body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#1e293b}" +
                ".card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}" +
                ".header{background:#0369a1;color:#fff;padding:20px 24px}" +
                ".header h1{margin:0;font-size:18px}" +
                ".header p{margin:4px 0 0;font-size:13px;opacity:.85}" +
                ".body{padding:24px}" +
                ".row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}" +
                ".row span:first-child{color:#64748b}" +
                ".amount{font-size:24px;font-weight:800;color:#0369a1;text-align:center;margin:16px 0}" +
                ".footer{text-align:center;font-size:11px;color:#94a3b8;padding:16px 24px}" +
                "@media print{body{background:#fff;padding:0}.card{box-shadow:none}}" +
                "</style></head><body>" +
                "<div class=\"card\">" +
                "<div class=\"header\"><h1>" + escape(schoolName) + "</h1><p>Fee Payment Receipt</p></div>" +
                "<div class=\"body\">" +
                "<div class=\"amount\">₹" + escape(p.getAmountPaid() != null ? p.getAmountPaid().toString() : "-") + "</div>" +
                "<div class=\"row\"><span>Receipt No.</span><span>" + escape(p.getReceiptNumber()) + "</span></div>" +
                "<div class=\"row\"><span>Student</span><span>" + escape(p.getStudentName()) + "</span></div>" +
                "<div class=\"row\"><span>Class</span><span>" + escape(p.getClassName()) + "</span></div>" +
                (p.getTerm() != null ? "<div class=\"row\"><span>Term</span><span>" + escape(p.getTerm()) + "</span></div>" : "") +
                "<div class=\"row\"><span>Payment Mode</span><span>" + escape(p.getPaymentMode()) + "</span></div>" +
                "<div class=\"row\"><span>Payment Date</span><span>" +
                (p.getPaymentDate() != null ? p.getPaymentDate().format(DATE_FORMAT) : "-") + "</span></div>" +
                "</div>" +
                "<div class=\"footer\">Generated by My-Skoolz — this is a system-generated receipt.</div>" +
                "</div></body></html>";
    }

    private String errorPage(String message) {
        return "<!doctype html><html><body style=\"font-family:Arial,sans-serif;text-align:center;padding:60px 20px;color:#64748b\">" +
                "<p>" + escape(message) + "</p></body></html>";
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
