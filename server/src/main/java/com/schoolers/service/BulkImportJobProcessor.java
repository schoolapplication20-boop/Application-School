package com.schoolers.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.*;
import com.schoolers.repository.ImportLogRepository;
import com.schoolers.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Runs bulk student import in a background thread so the HTTP request returns
 * immediately (no 60-second timeout). Progress is persisted to import_logs
 * every BATCH_SIZE rows so the frontend can poll for live updates.
 */
@Component
public class BulkImportJobProcessor {

    private static final Logger log = LoggerFactory.getLogger(BulkImportJobProcessor.class);
    private static final int BATCH_SIZE = 50;

    @Autowired private AdminService         adminService;
    @Autowired private ImportLogRepository  importLogRepo;
    @Autowired private StudentRepository    studentRepo;
    @Autowired private ObjectMapper         objectMapper;

    @Async
    public void processAsync(Long logId, BulkImportRequest request, Long schoolId) {
        log.info("[BulkImport] job={} starting, totalRows={}", logId, request.getRows().size());

        List<StudentImportRowDto> rows          = request.getRows();
        boolean                   skipInvalid   = request.isSkipInvalid();
        boolean                   createAccounts= request.isCreateAccounts();

        List<FailedRowDto>         failed      = new ArrayList<>();
        List<StudentCredentialDto> credentials = new ArrayList<>();
        int imported   = 0;
        int duplicates = 0;

        // Pre-load all existing admission numbers for this school once — avoids one
        // DB query per row and is safe because we also track the current batch in
        // batchAdmNos so intra-batch duplicates are caught even before the first flush.
        Set<String> existingAdmNos = studentRepo.findBySchoolId(schoolId).stream()
                .map(s -> s.getAdmissionNumber())
                .filter(Objects::nonNull)
                .map(String::toLowerCase)
                .collect(Collectors.toCollection(HashSet::new));

        Set<String> batchAdmNos = new HashSet<>();

        try {
            for (int i = 0; i < rows.size(); i++) {
                StudentImportRowDto row   = rows.get(i);
                String              admNo = row.getAdmissionNumber() != null
                        ? row.getAdmissionNumber().trim().toLowerCase() : null;

                // ── Duplicate checks ───────────────────────────────────────
                if (admNo != null && !admNo.isEmpty() && existingAdmNos.contains(admNo)) {
                    duplicates++;
                    failed.add(failRow(row, "Duplicate: admission number already exists in school database"));
                    continue;
                }
                if (admNo != null && !admNo.isEmpty() && batchAdmNos.contains(admNo)) {
                    duplicates++;
                    failed.add(failRow(row, "Duplicate: admission number appears more than once in this file"));
                    continue;
                }

                // ── Create student ─────────────────────────────────────────
                try {
                    Map<String, Object> body = buildStudentMap(row, schoolId, createAccounts);
                    ApiResponse<Map<String, Object>> result = adminService.createStudent(body);

                    if (result.isSuccess()) {
                        imported++;
                        if (admNo != null && !admNo.isEmpty()) {
                            batchAdmNos.add(admNo);
                            existingAdmNos.add(admNo);
                        }
                        if (createAccounts && result.getData() != null
                                && result.getData().containsKey("studentTempPassword")) {
                            credentials.add(new StudentCredentialDto(
                                    row.getFullName(),
                                    row.getAdmissionNumber(),
                                    row.getClassName(),
                                    row.getSection(),
                                    row.getFatherName(),
                                    row.getFatherPhone(),
                                    (String) result.getData().get("studentUsername"),
                                    (String) result.getData().get("studentEmail"),
                                    (String) result.getData().get("studentTempPassword")
                            ));
                        }
                    } else {
                        failed.add(failRow(row, result.getMessage()));
                        if (!skipInvalid) break;
                    }
                } catch (Exception e) {
                    failed.add(failRow(row, sanitize(e.getMessage())));
                    if (!skipInvalid) break;
                }

                // ── Push progress every BATCH_SIZE rows ────────────────────
                if ((i + 1) % BATCH_SIZE == 0) {
                    try {
                        importLogRepo.updateProgress(logId, i + 1, imported, failed.size(), duplicates);
                    } catch (Exception ignored) {}
                }
            }

            // ── Final update ───────────────────────────────────────────────
            String finalStatus = failed.isEmpty() ? "COMPLETED"
                    : (imported > 0 ? "PARTIAL" : "FAILED");
            String failedJson = objectMapper.writeValueAsString(failed);
            String credJson   = credentials.isEmpty() ? null
                    : objectMapper.writeValueAsString(credentials);

            importLogRepo.updateFinal(logId, rows.size(), imported, failed.size(),
                    duplicates, failedJson, credJson, finalStatus);

            log.info("[BulkImport] job={} {} — imported={} failed={} dupes={}",
                    logId, finalStatus, imported, failed.size(), duplicates);

        } catch (Exception e) {
            log.error("[BulkImport] job={} unexpected error: {}", logId, e.getMessage(), e);
            try { importLogRepo.updateStatus(logId, "FAILED"); } catch (Exception ignored) {}
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Map<String, Object> buildStudentMap(StudentImportRowDto row,
                                                Long schoolId, boolean createAccounts) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("schoolId",       schoolId);
        map.put("name",           row.getFullName());
        String roll = (row.getRollNumber() != null && !row.getRollNumber().isBlank())
                ? row.getRollNumber() : row.getAdmissionNumber();
        map.put("rollNumber",     roll);
        map.put("admissionNumber",row.getAdmissionNumber());
        String[] cs = parseClassSection(row.getClassName(), row.getSection());
        map.put("className",      cs[0]);
        map.put("section",        cs[1]);
        map.put("fatherName",     row.getFatherName());
        map.put("parentMobile",   row.getFatherPhone());
        map.put("motherName",     row.getMotherName());
        map.put("motherMobile",   row.getMotherPhone());
        map.put("address",        row.getAddress());
        map.put("idProofName",    row.getIdProofFileName());
        if (row.getStudentEmail() != null && !row.getStudentEmail().isBlank()) {
            map.put("studentEmail", row.getStudentEmail().trim());
        } else if (createAccounts) {
            map.put("createAccountWithoutEmail", true);
        } else {
            map.put("status", "Inactive");
        }
        return map;
    }

    private String[] parseClassSection(String rawClass, String rawSection) {
        String cls = rawClass  != null ? rawClass.trim()  : "";
        String sec = rawSection != null ? rawSection.trim() : "";
        cls = cls.replaceAll("(?i)^class\\s+", "").trim();
        if (sec.isEmpty()) {
            if (cls.contains(" - ")) {
                String[] p = cls.split(" - ", 2); cls = p[0].trim(); sec = p[1].trim();
            } else if (cls.contains("-")) {
                String[] p = cls.split("-", 2); cls = p[0].trim(); sec = p[1].trim();
            } else {
                String d = cls.replaceAll("[^0-9].*$", "");
                String l = cls.replaceAll("^[0-9]+\\s*", "");
                if (!d.isEmpty() && !l.isEmpty()) { cls = d; sec = l; }
            }
        } else {
            cls = cls.replaceAll("(?i)\\s*-\\s*" + java.util.regex.Pattern.quote(sec) + "$", "").trim();
        }
        return new String[]{ cls, sec };
    }

    private FailedRowDto failRow(StudentImportRowDto row, String reason) {
        return new FailedRowDto(row.getRowNumber(), row.getFullName(),
                row.getAdmissionNumber(), row.getRollNumber(), row.getClassName(), reason);
    }

    private String sanitize(String msg) {
        if (msg == null) return "Unknown error";
        if (msg.contains("uq_roll_class_section_school")) return "Duplicate roll number in this class/section";
        if (msg.contains("admission_number"))             return "Duplicate admission number";
        if (msg.contains("capacity"))                     return "Class capacity reached";
        return msg.length() > 200 ? msg.substring(0, 200) : msg;
    }
}
