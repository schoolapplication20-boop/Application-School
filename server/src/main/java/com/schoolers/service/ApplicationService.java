package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.AdmissionApplication;
import com.schoolers.repository.AdmissionApplicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ApplicationService {

    @Autowired
    private AdmissionApplicationRepository applicationRepository;

    public ApiResponse<List<AdmissionApplication>> getAll(Long schoolId) {
        if (schoolId != null) return ApiResponse.success(applicationRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId));
        return ApiResponse.success(applicationRepository.findAllByOrderByCreatedAtDesc());
    }

    public ApiResponse<List<AdmissionApplication>> getByStatus(String status, Long schoolId) {
        try {
            AdmissionApplication.Status s = AdmissionApplication.Status.valueOf(status.toUpperCase());
            if (schoolId != null) return ApiResponse.success(applicationRepository.findByStatusAndSchoolId(s, schoolId));
            return ApiResponse.success(applicationRepository.findByStatus(s));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("Invalid status: " + status);
        }
    }

    public ApiResponse<AdmissionApplication> create(Map<String, Object> body, Long schoolId) {
        String studentName = str(body, "studentName", null);
        if (studentName == null || studentName.isBlank()) return ApiResponse.error("Student name is required");

        AdmissionApplication app = AdmissionApplication.builder()
                .studentName(studentName)
                .dob(str(body, "dob", null))
                .gender(str(body, "gender", null))
                .classApplied(str(body, "classApplied", null))
                .fatherName(str(body, "fatherName", null))
                .fatherPhone(str(body, "fatherPhone", str(body, "fatherMobile", null)))
                .motherName(str(body, "motherName", null))
                .motherPhone(str(body, "motherPhone", str(body, "motherMobile", null)))
                .guardianName(str(body, "guardianName", null))
                .guardianPhone(str(body, "guardianPhone", str(body, "guardianMobile", null)))
                .email(str(body, "email", null))
                .prevSchool(str(body, "prevSchool", null))
                .permanentAddress(str(body, "permanentAddress", null))
                .alternateAddress(str(body, "alternateAddress", null))
                .idProof(str(body, "idProof", null))
                .idProofName(str(body, "idProofName", null))
                .tcDoc(str(body, "tcDoc", null))
                .tcDocName(str(body, "tcDocName", null))
                .bonafideDoc(str(body, "bonafideDoc", null))
                .bonafideDocName(str(body, "bonafideDocName", null))
                .schoolId(schoolId)
                .status(AdmissionApplication.Status.PENDING)
                .build();
        return ApiResponse.success("Application submitted", applicationRepository.save(app));
    }

    public ApiResponse<AdmissionApplication> updateStatus(Long id, Map<String, Object> body, Long schoolId) {
        return applicationRepository.findById(id)
                .map(app -> {
                    if (schoolId != null && app.getSchoolId() != null && !schoolId.equals(app.getSchoolId()))
                        return ApiResponse.<AdmissionApplication>error("Access denied: application belongs to another school");
                    String statusStr = str(body, "status", null);
                    if (statusStr != null) {
                        try { app.setStatus(AdmissionApplication.Status.valueOf(statusStr.toUpperCase())); }
                        catch (IllegalArgumentException ignored) {}
                    }
                    return ApiResponse.success("Application updated", applicationRepository.save(app));
                })
                .orElse(ApiResponse.error("Application not found"));
    }

    public ApiResponse<String> delete(Long id, Long schoolId) {
        return applicationRepository.findById(id)
                .map(app -> {
                    if (schoolId != null && app.getSchoolId() != null && !schoolId.equals(app.getSchoolId()))
                        return ApiResponse.<String>error("Access denied: application belongs to another school");
                    applicationRepository.deleteById(id);
                    return ApiResponse.success("Application deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Application not found"));
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }
}
