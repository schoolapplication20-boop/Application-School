package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.ClassDiary;
import com.schoolers.repository.ClassDiaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@Service
public class ClassDiaryService {

    @Autowired
    private ClassDiaryRepository diaryRepository;

    public ApiResponse<List<ClassDiary>> getAll(String className, Long teacherId, String date) {
        LocalDate parsedDate = parseDate(date);
        if (className == null && teacherId == null && parsedDate == null) {
            return ApiResponse.success(diaryRepository.findAllByOrderByCreatedAtDesc());
        }
        return ApiResponse.success(diaryRepository.findWithFilters(className, teacherId, parsedDate));
    }

    public ApiResponse<List<ClassDiary>> getByClass(String className) {
        return ApiResponse.success(diaryRepository.findByClassNameOrderByDiaryDateDesc(className));
    }

    public ApiResponse<ClassDiary> create(Map<String, Object> body) {
        String className = str(body, "className", null);
        if (className == null || className.isBlank()) return ApiResponse.error("Class name is required");

        String imageUrl = str(body, "imageUrl", null);
        if (imageUrl == null || imageUrl.isBlank()) return ApiResponse.error("Diary image is required");

        Long teacherId = longVal(body, "teacherId", null);
        if (teacherId == null) return ApiResponse.error("Teacher ID is required");

        LocalDate diaryDate = parseDate(str(body, "diaryDate", null));
        if (diaryDate == null) diaryDate = LocalDate.now();

        // Duplicate check: same teacher + class + date
        boolean exists = diaryRepository
                .findByClassNameAndDiaryDateAndTeacherId(className, diaryDate, teacherId)
                .isPresent();
        if (exists) {
            return ApiResponse.error("A diary entry already exists for this class on " + diaryDate);
        }

        ClassDiary diary = ClassDiary.builder()
                .className(className)
                .section(str(body, "section", null))
                .subject(str(body, "subject", null))
                .teacherId(teacherId)
                .teacherName(str(body, "teacherName", null))
                .diaryDate(diaryDate)
                .imageUrl(imageUrl)
                .imageName(str(body, "imageName", null))
                .description(str(body, "description", null))
                .build();

        return ApiResponse.success("Diary entry created successfully", diaryRepository.save(diary));
    }

    public ApiResponse<ClassDiary> updateReview(Long id, Map<String, Object> body) {
        return diaryRepository.findById(id)
                .map(diary -> {
                    String status = str(body, "reviewStatus", null);
                    if (status != null) {
                        try {
                            diary.setReviewStatus(ClassDiary.ReviewStatus.valueOf(status.toUpperCase()));
                        } catch (IllegalArgumentException ignored) {}
                    }
                    if (body.containsKey("adminComment")) {
                        diary.setAdminComment(str(body, "adminComment", diary.getAdminComment()));
                    }
                    return ApiResponse.success("Review updated", diaryRepository.save(diary));
                })
                .orElse(ApiResponse.error("Diary entry not found"));
    }

    public ApiResponse<String> delete(Long id) {
        if (!diaryRepository.existsById(id)) return ApiResponse.error("Diary entry not found");
        diaryRepository.deleteById(id);
        return ApiResponse.success("Diary entry deleted", "Deleted");
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (DateTimeParseException e) { return null; }
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
