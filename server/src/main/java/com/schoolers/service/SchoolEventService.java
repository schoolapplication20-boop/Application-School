package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.SchoolEvent;
import com.schoolers.repository.SchoolEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class SchoolEventService {

    @Autowired private SchoolEventRepository eventRepository;
    @Autowired private com.schoolers.repository.UserRepository userRepository;

    public ApiResponse<List<SchoolEvent>> getEvents(Long schoolId, String from, String to) {
        if (from != null && to != null) {
            try {
                LocalDate f = LocalDate.parse(from);
                LocalDate t = LocalDate.parse(to);
                return ApiResponse.success(eventRepository.findBySchoolIdAndDateRange(schoolId, f, t));
            } catch (Exception ignored) {}
        }
        return ApiResponse.success(eventRepository.findBySchoolIdOrderByStartDateAsc(schoolId));
    }

    public ApiResponse<SchoolEvent> createEvent(Map<String, Object> body, Authentication auth, Long schoolId) {
        String title = str(body, "title");
        if (title == null || title.isBlank()) return ApiResponse.error("Title is required");
        String startDateStr = str(body, "startDate");
        if (startDateStr == null) return ApiResponse.error("Start date is required");

        LocalDate startDate;
        try { startDate = LocalDate.parse(startDateStr); } catch (Exception e) {
            return ApiResponse.error("Invalid start date");
        }
        LocalDate endDate = null;
        String endDateStr = str(body, "endDate");
        if (endDateStr != null && !endDateStr.isBlank()) {
            try { endDate = LocalDate.parse(endDateStr); } catch (Exception ignored) {}
        }

        Long userId = resolveUserId(auth);
        SchoolEvent event = SchoolEvent.builder()
                .title(title.trim())
                .description(str(body, "description"))
                .startDate(startDate)
                .endDate(endDate)
                .eventType(str(body, "eventType") != null ? str(body, "eventType") : "EVENT")
                .schoolId(schoolId)
                .createdBy(userId)
                .build();

        return ApiResponse.success("Event created", eventRepository.save(event));
    }

    public ApiResponse<SchoolEvent> updateEvent(Long id, Map<String, Object> body, Long schoolId) {
        SchoolEvent event = eventRepository.findById(id).orElse(null);
        if (event == null) return ApiResponse.error("Event not found");
        if (schoolId != null && !schoolId.equals(event.getSchoolId())) return ApiResponse.error("Unauthorized");

        String title = str(body, "title");
        if (title != null && !title.isBlank()) event.setTitle(title.trim());
        String desc = str(body, "description");
        if (desc != null) event.setDescription(desc);
        String type = str(body, "eventType");
        if (type != null) event.setEventType(type);
        String startStr = str(body, "startDate");
        if (startStr != null) { try { event.setStartDate(LocalDate.parse(startStr)); } catch (Exception ignored) {} }
        String endStr = str(body, "endDate");
        if (endStr != null && !endStr.isBlank()) { try { event.setEndDate(LocalDate.parse(endStr)); } catch (Exception ignored) {} }

        return ApiResponse.success("Event updated", eventRepository.save(event));
    }

    public ApiResponse<String> deleteEvent(Long id, Long schoolId) {
        SchoolEvent event = eventRepository.findById(id).orElse(null);
        if (event == null) return ApiResponse.error("Event not found");
        if (schoolId != null && !schoolId.equals(event.getSchoolId())) return ApiResponse.error("Unauthorized");
        eventRepository.deleteById(id);
        return ApiResponse.success("Event deleted");
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }

    private Long resolveUserId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).map(u -> u.getId()).orElse(null);
    }
}
