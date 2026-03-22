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

    public ApiResponse<List<AdmissionApplication>> getAll() {
        return ApiResponse.success(applicationRepository.findAllByOrderByCreatedAtDesc());
    }

    public ApiResponse<List<AdmissionApplication>> getByStatus(String status) {
        try {
            AdmissionApplication.Status s = AdmissionApplication.Status.valueOf(status.toUpperCase());
            return ApiResponse.success(applicationRepository.findByStatus(s));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("Invalid status: " + status);
        }
    }

    public ApiResponse<AdmissionApplication> create(Map<String, Object> body) {
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
                .status(AdmissionApplication.Status.PENDING)
                .build();
        return ApiResponse.success("Application submitted", applicationRepository.save(app));
    }

    public ApiResponse<AdmissionApplication> updateStatus(Long id, Map<String, Object> body) {
        return applicationRepository.findById(id)
                .map(app -> {
                    String statusStr = str(body, "status", null);
                    if (statusStr != null) {
                        try { app.setStatus(AdmissionApplication.Status.valueOf(statusStr.toUpperCase())); }
                        catch (IllegalArgumentException ignored) {}
                     }
                    // if (body.containsKey("adminNotes")) app.setAdminNotes(str(body, "adminNotes", app.getAdminNotes()));
                    return ApiResponse.success("Application updated", applicationRepository.save(app));
                })
                .orElse(ApiResponse.error("Application not found"));
    }

    public ApiResponse<String> delete(Long id) {
        if (!applicationRepository.existsById(id)) return ApiResponse.error("Application not found");
        applicationRepository.deleteById(id);
        return ApiResponse.success("Application deleted", "Deleted");
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }
}
