package com.schoolers.service;

import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class AiService {

    private static final Logger log = Logger.getLogger(AiService.class.getName());

    private static final String GEMINI_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Autowired private StudentRepository  studentRepository;
    @Autowired private TeacherRepository  teacherRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private FeeRepository      feeRepository;
    @Autowired private SchoolRepository   schoolRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    public String chat(String message, List<Map<String, String>> history, Long schoolId, String role) {
        if (geminiApiKey == null || geminiApiKey.isBlank())
            return "AI assistant is not configured yet. Please set the GEMINI_API_KEY environment variable on your server.";

        String systemPrompt = buildSystemPrompt(schoolId, role);

        // Build contents array from history + new message
        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (Map<String, String> h : history) {
                contents.add(buildContent(h.get("role"), h.get("text")));
            }
        }
        contents.add(buildContent("user", message));

        Map<String, Object> body = new HashMap<>();
        body.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of(
            "temperature", 0.7,
            "maxOutputTokens", 1024
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                GEMINI_URL + geminiApiKey,
                new HttpEntity<>(body, headers),
                Map.class
            );

            if (response == null) return "No response from AI. Please try again.";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return "AI returned an empty response.";

            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

            return parts.get(0).get("text").toString().trim();

        } catch (Exception e) {
            log.severe("[AiService] Gemini API call failed: " + e.getMessage());
            return "AI request failed: " + e.getMessage();
        }
    }

    private String buildSystemPrompt(Long schoolId, String role) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an AI assistant built into My-Skoolz, a school management platform used by schools in India.\n");
        sb.append("You are helping a ").append(formatRole(role)).append(".\n\n");

        try {
            if (schoolId != null) {
                // School-scoped data
                String schoolName = schoolRepository.findById(schoolId)
                    .map(s -> s.getName()).orElse("this school");

                long students    = studentRepository.countBySchoolId(schoolId);
                long active      = studentRepository.countBySchoolIdAndIsActive(schoolId, true);
                long teachers    = teacherRepository.countBySchoolId(schoolId);
                long classes     = classRoomRepository.countBySchoolId(schoolId);
                BigDecimal paid  = nullSafe(feeRepository.sumPaidFeesBySchool(schoolId));
                BigDecimal pending = nullSafe(feeRepository.sumPendingFeesBySchool(schoolId));

                sb.append("LIVE SCHOOL DATA for ").append(schoolName).append(":\n");
                sb.append("- Total students: ").append(students)
                  .append(" (").append(active).append(" active)\n");
                sb.append("- Total teachers: ").append(teachers).append("\n");
                sb.append("- Total classes: ").append(classes).append("\n");
                sb.append("- Fees collected: ₹").append(paid.toPlainString()).append("\n");
                sb.append("- Fees pending: ₹").append(pending.toPlainString()).append("\n");
            } else {
                // APPLICATION_OWNER — platform-wide stats
                long totalSchools   = schoolRepository.count();
                BigDecimal allPaid  = nullSafe(feeRepository.sumPaidFees());
                BigDecimal allPending = nullSafe(feeRepository.sumPendingFees());

                sb.append("PLATFORM-WIDE DATA:\n");
                sb.append("- Total schools on platform: ").append(totalSchools).append("\n");
                sb.append("- Total fees collected across all schools: ₹").append(allPaid.toPlainString()).append("\n");
                sb.append("- Total pending fees across all schools: ₹").append(allPending.toPlainString()).append("\n");
            }
        } catch (Exception e) {
            sb.append("(Live data unavailable at this moment)\n");
        }

        sb.append("\nYou can help with:\n");
        sb.append("- Answering questions about the above live data\n");
        sb.append("- School management advice and best practices\n");
        sb.append("- Drafting announcements, notices, or parent communications\n");
        sb.append("- Explaining fee structures, attendance policies, exam schedules\n");
        sb.append("- General guidance on school administration\n\n");
        sb.append("Rules:\n");
        sb.append("- Be concise and clear. Use bullet points for lists.\n");
        sb.append("- Use ₹ for Indian currency. Use Indian school context.\n");
        sb.append("- Only state data that is in the live data above — never invent numbers.\n");
        sb.append("- If the user asks something outside your data, say so honestly and offer general advice.\n");
        sb.append("- Reply in the same language the user writes in.\n");

        return sb.toString();
    }

    private Map<String, Object> buildContent(String role, String text) {
        return Map.of(
            "role", role,
            "parts", List.of(Map.of("text", text != null ? text : ""))
        );
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String formatRole(String role) {
        if (role == null) return "administrator";
        return switch (role) {
            case "APPLICATION_OWNER" -> "platform owner";
            case "SUPER_ADMIN" -> "school owner (Super Admin)";
            case "ADMIN" -> "school administrator";
            default -> "administrator";
        };
    }
}
