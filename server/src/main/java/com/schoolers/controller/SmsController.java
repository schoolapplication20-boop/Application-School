package com.schoolers.controller;

import com.schoolers.dto.sms.SmsBulkSendRequest;
import com.schoolers.dto.sms.SmsSendRequest;
import com.schoolers.model.sms.TargetType;
import com.schoolers.security.CurrentUserUtil;
import com.schoolers.service.sms.NotificationPreferenceService;
import com.schoolers.service.sms.SmsService;
import com.schoolers.service.sms.SmsTemplateService;
import com.schoolers.service.sms.TargetSelection;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Admin-only SMS / bulk SMS notification API: send, schedule, templates, history, dashboard stats, preferences. */
@RestController
@RequestMapping("/api/sms")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class SmsController {

    private final SmsService smsService;
    private final SmsTemplateService templateService;
    private final NotificationPreferenceService preferenceService;
    private final CurrentUserUtil currentUserUtil;

    public SmsController(SmsService smsService,
                          SmsTemplateService templateService,
                          NotificationPreferenceService preferenceService,
                          CurrentUserUtil currentUserUtil) {
        this.smsService = smsService;
        this.templateService = templateService;
        this.preferenceService = preferenceService;
        this.currentUserUtil = currentUserUtil;
    }

    // ── Sending ────────────────────────────────────────────────────────────

    @PostMapping("/send")
    public ResponseEntity<?> sendSingle(@RequestBody SmsSendRequest request, Authentication auth) {
        var response = smsService.sendSingle(currentUserUtil.getCurrentSchoolId(auth), currentUserUtil.getCurrentUserId(auth), request);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> sendBulk(@RequestBody SmsBulkSendRequest request, Authentication auth) {
        var response = smsService.sendBulk(currentUserUtil.getCurrentSchoolId(auth), currentUserUtil.getCurrentUserId(auth), request);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/recipients/preview")
    public ResponseEntity<?> previewRecipients(
            @RequestParam TargetType targetType,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) List<Long> studentIds,
            @RequestParam(required = false) List<String> customPhones,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        TargetSelection selection = new TargetSelection(targetType, className, section, studentIds, customPhones, date);
        var response = smsService.previewRecipients(currentUserUtil.getCurrentSchoolId(auth), selection);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Campaigns ──────────────────────────────────────────────────────────

    @GetMapping("/campaigns")
    public ResponseEntity<?> getCampaigns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(smsService.getCampaigns(currentUserUtil.getCurrentSchoolId(auth), page, size));
    }

    @GetMapping("/campaigns/active")
    public ResponseEntity<?> getActiveCampaigns(Authentication auth) {
        return ResponseEntity.ok(smsService.getActiveCampaigns(currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/campaigns/{id}")
    public ResponseEntity<?> getCampaign(@PathVariable Long id, Authentication auth) {
        var response = smsService.getCampaign(currentUserUtil.getCurrentSchoolId(auth), id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(404).body(response);
    }

    @PostMapping("/campaigns/{id}/cancel")
    public ResponseEntity<?> cancelCampaign(@PathVariable Long id, Authentication auth) {
        var response = smsService.cancelCampaign(currentUserUtil.getCurrentSchoolId(auth), id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── History & dashboard ───────────────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        var response = smsService.getHistory(currentUserUtil.getCurrentSchoolId(auth), status, from, to, search, page, size);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Authentication auth) {
        return ResponseEntity.ok(smsService.getStats(currentUserUtil.getCurrentSchoolId(auth)));
    }

    // ── Templates ──────────────────────────────────────────────────────────

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(@RequestParam(required = false, defaultValue = "false") boolean activeOnly, Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        return ResponseEntity.ok(activeOnly ? templateService.getActive(schoolId) : templateService.getAll(schoolId));
    }

    @GetMapping("/templates/{id}")
    public ResponseEntity<?> getTemplate(@PathVariable Long id, Authentication auth) {
        var response = templateService.getById(currentUserUtil.getCurrentSchoolId(auth), id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(404).body(response);
    }

    @PostMapping("/templates")
    public ResponseEntity<?> createTemplate(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = templateService.create(currentUserUtil.getCurrentSchoolId(auth), currentUserUtil.getCurrentUserId(auth), body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = templateService.update(currentUserUtil.getCurrentSchoolId(auth), id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable Long id, Authentication auth) {
        var response = templateService.delete(currentUserUtil.getCurrentSchoolId(auth), id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(404).body(response);
    }

    // ── Notification preferences ──────────────────────────────────────────

    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences(Authentication auth) {
        return ResponseEntity.ok(preferenceService.getAll(currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PutMapping("/preferences/{category}")
    public ResponseEntity<?> updatePreference(@PathVariable String category, @RequestBody Map<String, Object> body, Authentication auth) {
        boolean smsEnabled = Boolean.TRUE.equals(body.get("smsEnabled"));
        var response = preferenceService.update(currentUserUtil.getCurrentSchoolId(auth), category, smsEnabled);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }
}
