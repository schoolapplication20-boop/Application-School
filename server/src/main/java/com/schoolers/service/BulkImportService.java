package com.schoolers.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.*;
import com.schoolers.model.ImportLog;
import com.schoolers.repository.ImportLogRepository;
import com.schoolers.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.util.logging.Logger;

@Service
public class BulkImportService {

    private static final Logger log = Logger.getLogger(BulkImportService.class.getName());

    @Autowired private AdminService         adminService;
    @Autowired private ImportLogRepository  importLogRepo;
    @Autowired private StudentRepository    studentRepo;
    @Autowired private ObjectMapper         objectMapper;

    public BulkImportResult importStudents(BulkImportRequest request,
                                           Long schoolId,
                                           Long adminId,
                                           String adminName) {
        List<StudentImportRowDto> rows       = request.getRows();
        boolean                  skipInvalid = request.isSkipInvalid();
        List<FailedRowDto>       failed      = new ArrayList<>();
        int imported    = 0;
        int duplicates  = 0;

        // Pre-load existing admission numbers for this school to detect DB duplicates fast
        Set<String> existingAdmNos = studentRepo.findBySchoolId(schoolId).stream()
            .map(s -> s.getAdmissionNumber())
            .filter(Objects::nonNull)
            .map(String::toLowerCase)
            .collect(Collectors.toSet());

        // Track admission numbers already seen within this batch
        Set<String> batchAdmNos = new HashSet<>();

        for (StudentImportRowDto row : rows) {
            String admNo = row.getAdmissionNumber() != null
                ? row.getAdmissionNumber().trim().toLowerCase() : null;

            // Detect admission-number duplicate in DB
            if (admNo != null && !admNo.isEmpty() && existingAdmNos.contains(admNo)) {
                duplicates++;
                failed.add(new FailedRowDto(row.getRowNumber(), row.getFullName(),
                    row.getAdmissionNumber(), row.getRollNumber(), row.getClassName(),
                    "Duplicate: admission number already exists in school database"));
                continue;
            }

            // Detect duplicate within the uploaded batch itself
            if (admNo != null && !admNo.isEmpty() && batchAdmNos.contains(admNo)) {
                duplicates++;
                failed.add(new FailedRowDto(row.getRowNumber(), row.getFullName(),
                    row.getAdmissionNumber(), row.getRollNumber(), row.getClassName(),
                    "Duplicate: admission number appears more than once in this file"));
                continue;
            }

            try {
                Map<String, Object> body = buildStudentMap(row, schoolId);
                ApiResponse<Map<String, Object>> result = adminService.createStudent(body);

                if (result.isSuccess()) {
                    imported++;
                    if (admNo != null) {
                        batchAdmNos.add(admNo);
                        existingAdmNos.add(admNo);
                    }
                } else {
                    failed.add(new FailedRowDto(row.getRowNumber(), row.getFullName(),
                        row.getAdmissionNumber(), row.getRollNumber(), row.getClassName(),
                        result.getMessage()));
                    if (!skipInvalid) break;
                }
            } catch (Exception e) {
                log.warning("[BulkImport] Row " + row.getRowNumber() + " failed: " + e.getMessage());
                failed.add(new FailedRowDto(row.getRowNumber(), row.getFullName(),
                    row.getAdmissionNumber(), row.getRollNumber(), row.getClassName(),
                    sanitizeError(e.getMessage())));
                if (!skipInvalid) break;
            }
        }

        String status = failed.isEmpty() ? "COMPLETED"
            : (imported > 0 ? "PARTIAL" : "FAILED");

        String failedJson;
        try { failedJson = objectMapper.writeValueAsString(failed); }
        catch (Exception e) { failedJson = "[]"; }

        ImportLog savedLog = importLogRepo.save(ImportLog.builder()
            .importType("STUDENT")
            .schoolId(schoolId)
            .importedBy(adminId)
            .importedByName(adminName)
            .totalRows(rows.size())
            .importedRows(imported)
            .failedRows(failed.size())
            .duplicateRows(duplicates)
            .failedRowsJson(failedJson)
            .status(status)
            .build());

        return BulkImportResult.builder()
            .totalRows(rows.size())
            .importedRows(imported)
            .failedRows(failed.size())
            .duplicateRows(duplicates)
            .failedRowDetails(failed)
            .importLogId(savedLog.getId())
            .status(status)
            .build();
    }

    public List<ImportLog> getHistory(Long schoolId) {
        return importLogRepo.findTop10BySchoolIdOrderByImportedAtDesc(schoolId);
    }

    public List<FailedRowDto> getFailedRows(Long logId, Long schoolId) {
        return importLogRepo.findById(logId).map(log -> {
            if (!schoolId.equals(log.getSchoolId()))
                throw new RuntimeException("Unauthorized");
            try {
                return objectMapper.readValue(log.getFailedRowsJson(),
                    new TypeReference<List<FailedRowDto>>() {});
            } catch (Exception e) {
                return List.<FailedRowDto>of();
            }
        }).orElseThrow(() -> new RuntimeException("Import log not found"));
    }

    private Map<String, Object> buildStudentMap(StudentImportRowDto row, Long schoolId) {
        Map<String, Object> map = new HashMap<>();
        map.put("schoolId",       schoolId);
        map.put("name",           row.getFullName());
        map.put("rollNumber",     row.getRollNumber());
        map.put("admissionNumber",row.getAdmissionNumber());
        map.put("className",      row.getClassName());
        map.put("section",        row.getSection());
        map.put("fatherName",     row.getFatherName());
        map.put("parentMobile",   row.getFatherPhone());
        map.put("motherName",     row.getMotherName());
        map.put("motherMobile",   row.getMotherPhone());
        map.put("address",        row.getAddress());
        map.put("idProofName",    row.getIdProofFileName());
        return map;
    }

    private String sanitizeError(String msg) {
        if (msg == null) return "Unknown error";
        if (msg.contains("uq_roll_class_section_school"))
            return "Duplicate roll number in this class/section";
        if (msg.contains("admission_number"))
            return "Duplicate admission number";
        if (msg.contains("capacity"))
            return "Class capacity reached";
        return msg.length() > 200 ? msg.substring(0, 200) : msg;
    }
}
