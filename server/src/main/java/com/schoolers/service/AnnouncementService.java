package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Announcement;
import com.schoolers.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AnnouncementService {

    @Autowired
    private AnnouncementRepository announcementRepository;

    public ApiResponse<List<Announcement>> getAll(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(announcementRepository.findBySchoolIdAndIsActiveTrueOrderByCreatedAtDesc(schoolId));
        }
        return ApiResponse.success(announcementRepository.findByIsActiveTrueOrderByCreatedAtDesc());
    }

    public ApiResponse<List<Announcement>> getForRole(String role, Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(
                announcementRepository.findBySchoolIdAndTargetRoleInOrderByCreatedAtDesc(
                    schoolId, List.of("ALL", role.toUpperCase()))
            );
        }
        return ApiResponse.success(
            announcementRepository.findByTargetRoleInOrderByCreatedAtDesc(List.of("ALL", role.toUpperCase()))
        );
    }

    public ApiResponse<Announcement> create(Map<String, Object> body, Long schoolId) {
        String title = str(body, "title", null);
        String content = str(body, "content", null);
        if (title == null || title.isBlank()) return ApiResponse.error("Title is required");
        if (title.length() > 200) return ApiResponse.error("Title cannot exceed 200 characters");
        if (content == null || content.isBlank()) return ApiResponse.error("Content is required");
        if (content.length() > 10000) return ApiResponse.error("Content cannot exceed 10000 characters");

        Announcement announcement = Announcement.builder()
                .title(title)
                .content(content)
                .targetRole(str(body, "targetRole", "ALL"))
                .createdBy(str(body, "createdBy", null))
                .createdById(longVal(body, "createdById", null))
                .schoolId(schoolId)
                .build();
        return ApiResponse.success("Announcement created", announcementRepository.save(announcement));
    }

    public ApiResponse<Announcement> update(Long id, Map<String, Object> body, Long schoolId) {
        return announcementRepository.findById(id)
                .map(a -> {
                    if (schoolId != null && a.getSchoolId() != null && !schoolId.equals(a.getSchoolId()))
                        return ApiResponse.<Announcement>error("Access denied: announcement belongs to another school");
                    if (body.containsKey("title")) {
                        String t = str(body, "title", a.getTitle());
                        if (t == null || t.isBlank()) return ApiResponse.<Announcement>error("Title is required");
                        if (t.length() > 200) return ApiResponse.<Announcement>error("Title cannot exceed 200 characters");
                        a.setTitle(t);
                    }
                    if (body.containsKey("content")) {
                        String c = str(body, "content", a.getContent());
                        if (c == null || c.isBlank()) return ApiResponse.<Announcement>error("Content is required");
                        if (c.length() > 10000) return ApiResponse.<Announcement>error("Content cannot exceed 10000 characters");
                        a.setContent(c);
                    }
                    if (body.containsKey("targetRole")) a.setTargetRole(str(body, "targetRole", a.getTargetRole()));
                    if (body.containsKey("isActive"))   a.setIsActive(Boolean.TRUE.equals(body.get("isActive")));
                    return ApiResponse.success("Announcement updated", announcementRepository.save(a));
                })
                .orElse(ApiResponse.error("Announcement not found"));
    }

    public ApiResponse<String> delete(Long id, Long schoolId) {
        Announcement a = announcementRepository.findById(id).orElse(null);
        if (a == null) return ApiResponse.error("Announcement not found");
        if (schoolId != null && a.getSchoolId() != null && !schoolId.equals(a.getSchoolId()))
            return ApiResponse.error("Access denied: announcement belongs to another school");
        announcementRepository.deleteById(id);
        return ApiResponse.success("Announcement deleted", "Deleted");
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }
}
