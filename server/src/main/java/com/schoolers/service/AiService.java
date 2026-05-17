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

        sb.append("\nERP NAVIGATION GUIDE (use this to answer 'how to' questions):\n");

        if (isAdmin) {
            sb.append("ADMIN actions:\n");
            sb.append("- Add a student: Go to sidebar → Students (/admin/students) → click '+ Add Student' button → fill in name, class, parent details → Save.\n");
            sb.append("- Add a teacher: Go to sidebar → Teachers (/admin/teachers) → click '+ Add Teacher' → fill in name, subject, contact → Save.\n");
            sb.append("- Add a class: Go to sidebar → Classes (/admin/classes) → click '+ Add Class' → enter class name and assign class teacher → Save.\n");
            sb.append("- Collect fee: Go to sidebar → Collect Fee (/admin/collect-fee) → search student → select fee type → enter amount → Submit.\n");
            sb.append("- View fee records: Go to sidebar → Fees (/admin/fees) → filter by class or student.\n");
            sb.append("- Add expense: Go to sidebar → Expenses (/admin/expenses) → click '+ Add Expense' → fill details → Save.\n");
            sb.append("- Manage leave requests: Go to sidebar → Leave (/admin/leave) → approve or reject pending requests.\n");
            sb.append("- View attendance report: Go to sidebar → Attendance Report (/admin/attendance-report) → filter by class and date.\n");
            sb.append("- Manage transport: Go to sidebar → Transport (/admin/transport) → add buses, routes, or assign students.\n");
            sb.append("- Set timetable: Go to sidebar → Timetable (/admin/timetable) → select class → assign periods.\n");
            sb.append("- Manage admissions: Go to sidebar → Applications (/admin/applications) → review and approve/reject applications.\n");
            sb.append("- Manage salaries: Go to sidebar → Salaries (/admin/salaries) → select teacher → enter salary details → Save.\n");
            sb.append("- Send messages: Go to sidebar → Messages (/admin/messages) → select recipient → type message → Send.\n");
            sb.append("- Manage parents: Go to sidebar → Parents (/admin/parents).\n");
            sb.append("- Examination: Go to sidebar → Examination (/admin/examination) → schedule exams and manage results.\n");
            sb.append("- School settings: Go to sidebar → Settings (/admin/settings) → update school info, logo, permissions.\n");
        } else if ("SUPER_ADMIN".equals(role)) {
            sb.append("SCHOOL OWNER actions:\n");
            sb.append("- Manage admins: Go to sidebar → Admins (/superadmin/admins) → add or manage admin accounts.\n");
            sb.append("- Setup school: Go to sidebar → Setup School (/superadmin/setup-school) → configure school details.\n");
            sb.append("- Exam schedule: Go to sidebar → Exam Schedule (/superadmin/exam-schedule) → view and manage exams.\n");
            sb.append("- All admin features are also available from the admin sidebar.\n");
        } else if ("TEACHER".equals(role)) {
            sb.append("TEACHER actions:\n");
            sb.append("- Mark attendance: Go to sidebar → Attendance (/teacher/attendance) → select class and date → mark present/absent → Submit.\n");
            sb.append("- View my students: Go to sidebar → My Students (/teacher/my-students) → see student list for your class.\n");
            sb.append("- Enter marks: Go to sidebar → Marks (/teacher/marks) → select exam and class → enter marks → Save.\n");
            sb.append("- Assign homework: Go to sidebar → Diary (/teacher/diary) → select class → add homework details → Save.\n");
            sb.append("- View schedule: Go to sidebar → Schedule (/teacher/schedule) → see your timetable.\n");
            sb.append("- Approve student leave: Go to sidebar → Leave Approval (/teacher/leave-approval) → approve or reject.\n");
            sb.append("- Apply for leave: Go to sidebar → Leave Request (/teacher/leave-request) → fill form → Submit.\n");
            sb.append("- Send messages: Go to sidebar → Messages (/teacher/messages) → select student or parent → Send.\n");
            sb.append("- View examination: Go to sidebar → Examination (/teacher/examination).\n");
        } else {
            sb.append("STUDENT actions:\n");
            sb.append("- View attendance: Go to sidebar → Attendance (/student/attendance) → see your attendance records.\n");
            sb.append("- View homework/diary: Go to sidebar → Diary (/student/diary) → see assignments given by teachers.\n");
            sb.append("- View fee status: Go to sidebar → Fees (/student/fees) → check paid and pending fees.\n");
            sb.append("- Apply for leave: Go to sidebar → Leave (/student/leave) → fill the leave form → Submit.\n");
            sb.append("- View messages: Go to sidebar → Messages (/student/messages) → read messages from teachers/admin.\n");
            sb.append("- View exams: Go to sidebar → Exams (/student/exams) → see exam schedule and results.\n");
        }

        sb.append("\nRules:\n");
        sb.append("- Be concise and helpful. Use bullet points for lists.\n");
        sb.append("- Use ₹ for Indian currency. Use Indian school context.\n");
        sb.append("- Only state numbers from the live data above — never invent numbers.\n");
        sb.append("- For 'how to' questions, always give step-by-step navigation instructions from the ERP guide above.\n");
        sb.append("- Never say 'live data doesn't provide' for navigation/how-to questions — use the ERP guide instead.\n");
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
