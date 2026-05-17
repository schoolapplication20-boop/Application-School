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

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL    = "llama-3.3-70b-versatile";

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Autowired private StudentRepository    studentRepository;
    @Autowired private TeacherRepository    teacherRepository;
    @Autowired private ClassRoomRepository  classRoomRepository;
    @Autowired private FeeRepository        feeRepository;
    @Autowired private SchoolRepository     schoolRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    public String chat(String message, List<Map<String, String>> history, Long schoolId, String role) {
        if (groqApiKey == null || groqApiKey.isBlank())
            return "AI assistant is not configured. Please set the GROQ_API_KEY environment variable on Render.";

        String systemPrompt = buildSystemPrompt(schoolId, role);

        // Build messages array: system + history + current message
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (history != null) {
            for (Map<String, String> h : history) {
                String r = "model".equals(h.get("role")) ? "assistant" : h.get("role");
                messages.add(Map.of("role", r, "content", h.getOrDefault("text", "")));
            }
        }
        messages.add(Map.of("role", "user", "content", message));

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", messages);
        body.put("temperature", 0.7);
        body.put("max_tokens", 1024);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        headers.set("Authorization", "Bearer " + groqApiKey);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                GROQ_URL,
                new HttpEntity<>(body, headers),
                Map.class
            );

            if (response == null) return "No response from AI. Please try again.";

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return "AI returned an empty response.";

            @SuppressWarnings("unchecked")
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            return msg.get("content").toString().trim();

        } catch (Exception e) {
            log.severe("[AiService] Groq API call failed: " + e.getMessage());
            return "AI request failed: " + e.getMessage();
        }
    }

    private static final java.util.Set<String> ADMIN_ROLES = java.util.Set.of(
        "ADMIN", "SUPER_ADMIN", "APPLICATION_OWNER"
    );

    private String buildSystemPrompt(Long schoolId, String role) {
        boolean isAdmin = role != null && ADMIN_ROLES.contains(role);

        StringBuilder sb = new StringBuilder();
        sb.append("You are My-Skoolz AI, an intelligent school ERP assistant similar to ChatGPT. ");
        sb.append("You help students, teachers, parents, and administrators with educational, academic, and general questions ");
        sb.append("in a helpful, conversational, and intelligent way.\n");
        sb.append("You are helping a ").append(formatRole(role)).append(".\n\n");

        try {
            if (schoolId != null) {
                String schoolName = schoolRepository.findById(schoolId)
                    .map(s -> s.getName()).orElse("this school");

                long students = studentRepository.countBySchoolId(schoolId);
                long active   = studentRepository.countBySchoolIdAndIsActive(schoolId, true);
                long teachers = teacherRepository.countBySchoolId(schoolId);
                long classes  = classRoomRepository.countBySchoolId(schoolId);

                sb.append("LIVE SCHOOL DATA for ").append(schoolName).append(":\n");
                sb.append("- Total students: ").append(students)
                  .append(" (").append(active).append(" active)\n");
                sb.append("- Total teachers: ").append(teachers).append("\n");
                sb.append("- Total classes: ").append(classes).append("\n");

                if (isAdmin) {
                    BigDecimal paid    = nullSafe(feeRepository.sumPaidFeesBySchool(schoolId));
                    BigDecimal pending = nullSafe(feeRepository.sumPendingFeesBySchool(schoolId));
                    sb.append("- Fees collected: ₹").append(paid.toPlainString()).append("\n");
                    sb.append("- Fees pending: ₹").append(pending.toPlainString()).append("\n");
                }
            } else if (isAdmin) {
                long totalSchools    = schoolRepository.count();
                BigDecimal allPaid   = nullSafe(feeRepository.sumPaidFees());
                BigDecimal allPending = nullSafe(feeRepository.sumPendingFees());

                sb.append("PLATFORM-WIDE DATA:\n");
                sb.append("- Total schools: ").append(totalSchools).append("\n");
                sb.append("- Total fees collected: ₹").append(allPaid.toPlainString()).append("\n");
                sb.append("- Total pending fees: ₹").append(allPending.toPlainString()).append("\n");
            }
        } catch (Exception e) {
            sb.append("(Live data unavailable)\n");
        }

        sb.append("\nRules:\n");
        sb.append("- Be concise and helpful. Use bullet points for lists.\n");
        sb.append("- Use ₹ for Indian currency. Use Indian school context.\n");
        sb.append("- Only state data that is in the live data above — never invent numbers.\n");
        if (!isAdmin) {
            sb.append("- Do NOT share fee amounts or financial data. Say: 'Please contact your school admin for fee details.'\n");
        }
        sb.append("- Reply in the same language the user writes in (English, Hindi, Telugu, etc.).\n");

        return sb.toString();
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String formatRole(String role) {
        if (role == null) return "user";
        return switch (role) {
            case "APPLICATION_OWNER" -> "platform owner";
            case "SUPER_ADMIN"       -> "school owner";
            case "ADMIN"             -> "school administrator";
            case "TEACHER"           -> "teacher";
            case "STUDENT"           -> "student";
            default                  -> "user";
        };
    }
}
