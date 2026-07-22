package com.schoolers.controller;

import com.schoolers.dto.whatsapp.WhatsAppConfigurationRequest;
import com.schoolers.dto.whatsapp.WhatsAppFeeReminderRequest;
import com.schoolers.model.whatsapp.WhatsAppTargetType;
import com.schoolers.security.CurrentUserUtil;
import com.schoolers.service.whatsapp.WhatsAppConfigurationService;
import com.schoolers.service.whatsapp.WhatsAppService;
import com.schoolers.service.whatsapp.WhatsAppTemplateService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin-only WhatsApp API: per-school settings, templates, fee-reminder sends, campaigns, history,
 * dashboard stats. Coexists safely under {@code /api/whatsapp} with {@link WhatsAppWebhookController}
 * — only the literal {@code /api/whatsapp/webhook} path is public (see {@code SecurityConfig});
 * everything else here is gated by this class's {@code @PreAuthorize}.
 */
@RestController
@RequestMapping("/api/whatsapp")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class WhatsAppController {

    private final WhatsAppService whatsAppService;
    private final WhatsAppTemplateService templateService;
    private final WhatsAppConfigurationService configurationService;
    private final CurrentUserUtil currentUserUtil;

    public WhatsAppController(WhatsAppService whatsAppService,
                              WhatsAppTemplateService templateService,
                              WhatsAppConfigurationService configurationService,
                              CurrentUserUtil currentUserUtil) {
        this.whatsAppService = whatsAppService;
        this.templateService = templateService;
        this.configurationService = configurationService;
        this.currentUserUtil = currentUserUtil;
    }

    // ── Sending ────────────────────────────────────────────────────────────

    @PostMapping("/fee-reminder")
    public ResponseEntity<?> sendFeeReminder(@RequestBody WhatsAppFeeReminderRequest request, Authentication auth) {
        var response = whatsAppService.sendFeeReminder(currentUserUtil.getCurrentSchoolId(auth), currentUserUtil.getCurrentUserId(auth), request);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/recipients/preview")
    public ResponseEntity<?> previewRecipients(
            @RequestParam WhatsAppTargetType targetType,
            @RequestParam(required = false) List<Long> studentIds,
            Authentication auth) {
        var response = whatsAppService.previewRecipients(currentUserUtil.getCurrentSchoolId(auth), targetType, studentIds);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Campaigns ──────────────────────────────────────────────────────────

    @GetMapping("/campaigns")
    public ResponseEntity<?> getCampaigns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(whatsAppService.getCampaigns(currentUserUtil.getCurrentSchoolId(auth), page, size));
    }

    @GetMapping("/campaigns/{id}")
    public ResponseEntity<?> getCampaign(@PathVariable Long id, Authentication auth) {
        var response = whatsAppService.getCampaign(currentUserUtil.getCurrentSchoolId(auth), id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(404).body(response);
    }

    @PostMapping("/campaigns/{id}/cancel")
    public ResponseEntity<?> cancelCampaign(@PathVariable Long id, Authentication auth) {
        var response = whatsAppService.cancelCampaign(currentUserUtil.getCurrentSchoolId(auth), id);
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
        var response = whatsAppService.getHistory(currentUserUtil.getCurrentSchoolId(auth), status, from, to, search, page, size);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(Authentication auth) {
        return ResponseEntity.ok(whatsAppService.getStats(currentUserUtil.getCurrentSchoolId(auth)));
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

    // ── Settings (per-school Meta credentials) ────────────────────────────

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(Authentication auth) {
        return ResponseEntity.ok(configurationService.getSettings(currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PutMapping("/settings")
    public ResponseEntity<?> saveSettings(@RequestBody WhatsAppConfigurationRequest request, Authentication auth) {
        var response = configurationService.saveSettings(currentUserUtil.getCurrentSchoolId(auth), request);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }
}
