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

    public ApiResponse<List<ClassDiary>> getAll(String className, Long teacherId, String date, Long schoolId) {
        LocalDate parsedDate = parseDate(date);
        List<ClassDiary> entries;
        if (schoolId != null) {
            entries = diaryRepository.findWithFiltersAndSchool(schoolId, className, teacherId, parsedDate);
        } else if (className == null && teacherId == null && parsedDate == null) {
            entries = diaryRepository.findAllByOrderByCreatedAtDesc();
        } else {
            entries = diaryRepository.findWithFilters(className, teacherId, parsedDate);
        }
        return ApiResponse.success(entries);
    }

    public ApiResponse<List<ClassDiary>> getByClass(String className, Long schoolId) {
        List<ClassDiary> entries = schoolId != null
                ? diaryRepository.findBySchoolIdAndClassNameOrderByDiaryDateDesc(schoolId, className)
                : diaryRepository.findByClassNameOrderByDiaryDateDesc(className);
        return ApiResponse.success(entries);
    }

    /** Teacher: fetch only their own diary entries */
    public ApiResponse<List<ClassDiary>> getForTeacher(Long teacherId, Long schoolId) {
        List<ClassDiary> entries = schoolId != null
                ? diaryRepository.findBySchoolIdAndTeacherIdOrderByDiaryDateDesc(schoolId, teacherId)
                : diaryRepository.findByTeacherIdOrderByDiaryDateDesc(teacherId);
        return ApiResponse.success(entries);
    }

    /** Student: fetch all diary entries for their class + section */
    public ApiResponse<List<ClassDiary>> getForStudent(String className, String section, Long schoolId) {
        List<ClassDiary> entries;
        if (schoolId != null) {
            if (section != null && !section.isBlank()) {
                entries = diaryRepository.findBySchoolIdAndClassNameAndSectionOrderByDiaryDateDesc(schoolId, className, section);
            } else {
                entries = diaryRepository.findBySchoolIdAndClassNameOrderByDiaryDateDesc(schoolId, className);
            }
        } else if (section != null && !section.isBlank()) {
            entries = diaryRepository.findByClassNameAndSectionOrderByDiaryDateDesc(className, section);
        } else {
            entries = diaryRepository.findByClassNameOrderByDiaryDateDesc(className);
        }
        return ApiResponse.success(entries);
    }

    public ApiResponse<ClassDiary> create(Map<String, Object> body) {
        String className = str(body, "className", null);
        if (className == null || className.isBlank()) return ApiResponse.error("Class name is required");

        String topic = str(body, "topic", null);
        if (topic == null || topic.isBlank()) return ApiResponse.error("Topic is required");
        if (topic.length() > 200) return ApiResponse.error("Topic cannot exceed 200 characters");

        String homework = str(body, "homework", null);
        if (homework == null || homework.isBlank()) return ApiResponse.error("Homework is required");
        if (homework.length() > 2000) return ApiResponse.error("Homework cannot exceed 2000 characters");

        Long teacherId = longVal(body, "teacherId", null);
        if (teacherId == null) return ApiResponse.error("Teacher ID is required");

        String subject = str(body, "subject", null);
        LocalDate diaryDate = parseDate(str(body, "diaryDate", null));
        if (diaryDate == null) diaryDate = LocalDate.now();

        String remarks = str(body, "remarks", null);
        if (remarks != null && remarks.length() > 500) return ApiResponse.error("Remarks cannot exceed 500 characters");
        String description = str(body, "description", null);
        if (description != null && description.length() > 2000) return ApiResponse.error("Description cannot exceed 2000 characters");

        Long schoolId = longVal(body, "schoolId", null);

        // Duplicate check: same teacher + class + subject + date (school-scoped when available)
        boolean exists = (schoolId != null)
                ? diaryRepository.existsBySchoolIdAndClassNameAndSubjectAndDiaryDateAndTeacherId(
                        schoolId, className, subject, diaryDate, teacherId)
                : diaryRepository.existsByClassNameAndSubjectAndDiaryDateAndTeacherId(
                        className, subject, diaryDate, teacherId);
        if (exists) {
            return ApiResponse.error("A diary entry already exists for this class/subject on " + diaryDate);
        }

        ClassDiary diary = ClassDiary.builder()
                .className(className)
                .section(str(body, "section", null))
                .subject(subject)
                .teacherId(teacherId)
                .teacherName(str(body, "teacherName", null))
                .diaryDate(diaryDate)
                .topic(topic)
                .homework(homework)
                .remarks(remarks)
                .imageUrl(str(body, "imageUrl", null))
                .imageName(str(body, "imageName", null))
                .description(description)
                .schoolId(schoolId)
                .build();

        return ApiResponse.success("Diary entry created successfully", diaryRepository.save(diary));
    }

    /** Teacher: update their own diary entry */
    public ApiResponse<ClassDiary> update(Long id, Map<String, Object> body, Long teacherId) {
        return diaryRepository.findById(id)
                .map(diary -> {
                    // Ownership check
                    if (!diary.getTeacherId().equals(teacherId)) {
                        return ApiResponse.<ClassDiary>error("You can only edit your own diary entries");
                    }
                    if (body.containsKey("topic")) {
                        String topic = str(body, "topic", null);
                        if (topic != null && !topic.isBlank()) {
                            if (topic.length() > 200) return ApiResponse.<ClassDiary>error("Topic cannot exceed 200 characters");
                            diary.setTopic(topic);
                        }
                    }
                    if (body.containsKey("homework")) {
                        String hw = str(body, "homework", null);
                        if (hw != null && !hw.isBlank()) {
                            if (hw.length() > 2000) return ApiResponse.<ClassDiary>error("Homework cannot exceed 2000 characters");
                            diary.setHomework(hw);
                        }
                    }
                    if (body.containsKey("remarks")) {
                        String r = str(body, "remarks", diary.getRemarks());
                        if (r != null && r.length() > 500) return ApiResponse.<ClassDiary>error("Remarks cannot exceed 500 characters");
                        diary.setRemarks(r);
                    }
                    if (body.containsKey("description")) {
                        String d = str(body, "description", diary.getDescription());
                        if (d != null && d.length() > 2000) return ApiResponse.<ClassDiary>error("Description cannot exceed 2000 characters");
                        diary.setDescription(d);
                    }
                    if (body.containsKey("imageUrl"))    diary.setImageUrl(str(body, "imageUrl", diary.getImageUrl()));
                    if (body.containsKey("imageName"))   diary.setImageName(str(body, "imageName", diary.getImageName()));
                    return ApiResponse.success("Diary entry updated", diaryRepository.save(diary));
                })
                .orElse(ApiResponse.error("Diary entry not found"));
    }

    public ApiResponse<ClassDiary> updateReview(Long id, Map<String, Object> body, Long schoolId) {
        return diaryRepository.findById(id)
                .map(diary -> {
                    if (schoolId != null && diary.getSchoolId() != null
                            && !schoolId.equals(diary.getSchoolId()))
                        return ApiResponse.<ClassDiary>error("Access denied: diary entry belongs to another school");
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

    public ApiResponse<String> delete(Long id, Long schoolId) {
        ClassDiary diary = diaryRepository.findById(id).orElse(null);
        if (diary == null) return ApiResponse.error("Diary entry not found");
        if (schoolId != null && diary.getSchoolId() != null && !schoolId.equals(diary.getSchoolId()))
            return ApiResponse.error("Access denied: diary entry belongs to another school");
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
