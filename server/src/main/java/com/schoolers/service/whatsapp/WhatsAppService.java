package com.schoolers.service.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.whatsapp.WhatsAppCampaignResponse;
import com.schoolers.dto.whatsapp.WhatsAppFeeReminderRequest;
import com.schoolers.dto.whatsapp.WhatsAppRecipientPreviewResponse;
import com.schoolers.dto.whatsapp.WhatsAppStatsResponse;
import com.schoolers.model.School;
import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.QueueStatus;
import com.schoolers.model.sms.TargetType;
import com.schoolers.model.whatsapp.WhatsAppApprovalStatus;
import com.schoolers.model.whatsapp.WhatsAppCampaign;
import com.schoolers.model.whatsapp.WhatsAppCategory;
import com.schoolers.model.whatsapp.WhatsAppLog;
import com.schoolers.model.whatsapp.WhatsAppLogStatus;
import com.schoolers.model.whatsapp.WhatsAppQueueItem;
import com.schoolers.model.whatsapp.WhatsAppTargetType;
import com.schoolers.model.whatsapp.WhatsAppTemplate;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.whatsapp.WhatsAppCampaignRepository;
import com.schoolers.repository.whatsapp.WhatsAppLogRepository;
import com.schoolers.repository.whatsapp.WhatsAppQueueRepository;
import com.schoolers.repository.whatsapp.WhatsAppTemplateRepository;
import com.schoolers.service.sms.SmsRecipient;
import com.schoolers.service.sms.SmsRecipientResolver;
import com.schoolers.service.sms.TargetSelection;
import com.schoolers.sms.PhoneUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Orchestrates WhatsApp sending: resolves recipients/templates, creates {@link WhatsAppCampaign} +
 * {@link WhatsAppQueueItem} rows, and exposes dashboard/history queries. Mirrors {@code SmsService}.
 * Actual sending happens asynchronously in {@link WhatsAppQueueProcessor} — this service only
 * enqueues work and nudges the processor to run right away.
 *
 * <p>Recipient resolution for the fee-reminder trigger deliberately reuses the SMS module's
 * {@link SmsRecipientResolver} (a pragmatic cross-module dependency in this monolith) rather than
 * duplicating its STUDENTS/FEE_DUE resolution logic.
 */
@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);
    private static final DateTimeFormatter CAMPAIGN_NAME_FORMAT = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");

    private final WhatsAppCampaignRepository campaignRepository;
    private final WhatsAppQueueRepository queueRepository;
    private final WhatsAppLogRepository logRepository;
    private final WhatsAppTemplateRepository templateRepository;
    private final WhatsAppConfigurationService configurationService;
    private final WhatsAppQueueProcessor queueProcessor;
    private final SmsRecipientResolver recipientResolver;
    private final SchoolRepository schoolRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${whatsapp.max.retry.attempts:3}")
    private int maxRetryAttempts;

    public WhatsAppService(WhatsAppCampaignRepository campaignRepository,
                            WhatsAppQueueRepository queueRepository,
                            WhatsAppLogRepository logRepository,
                            WhatsAppTemplateRepository templateRepository,
                            WhatsAppConfigurationService configurationService,
                            WhatsAppQueueProcessor queueProcessor,
                            SmsRecipientResolver recipientResolver,
                            SchoolRepository schoolRepository) {
        this.campaignRepository = campaignRepository;
        this.queueRepository = queueRepository;
        this.logRepository = logRepository;
        this.templateRepository = templateRepository;
        this.configurationService = configurationService;
        this.queueProcessor = queueProcessor;
        this.recipientResolver = recipientResolver;
        this.schoolRepository = schoolRepository;
    }

    /** Admin-triggered fee reminder to selected students or all students with a pending/overdue/partial fee. */
    @Transactional
    public ApiResponse<WhatsAppCampaignResponse> sendFeeReminder(Long schoolId, Long createdBy, WhatsAppFeeReminderRequest request) {
        if (!configurationService.isConfigured(schoolId)) {
            return ApiResponse.error("WhatsApp is not configured — go to WhatsApp → Settings to add your Meta credentials");
        }
        if (request.getTargetType() != WhatsAppTargetType.STUDENTS && request.getTargetType() != WhatsAppTargetType.FEE_DUE) {
            return ApiResponse.error("Fee reminders can only target selected students or students with pending fees");
        }
        if (request.getTemplateId() == null) return ApiResponse.error("templateId is required");

        WhatsAppTemplate template = templateRepository.findByIdAndSchoolId(request.getTemplateId(), schoolId).orElse(null);
        if (template == null) return ApiResponse.error("Template not found");
        if (!Boolean.TRUE.equals(template.getIsActive())) return ApiResponse.error("Template is inactive");
        if (template.getApprovalStatus() != WhatsAppApprovalStatus.APPROVED) {
            return ApiResponse.error("This template has not been marked APPROVED on Meta yet — sending would fail");
        }

        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existing = campaignRepository.findBySchoolIdAndIdempotencyKey(schoolId, request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return ApiResponse.success("Campaign already exists for this request", WhatsAppCampaignResponse.from(existing.get()));
            }
        }

        TargetType smsTargetType = request.getTargetType() == WhatsAppTargetType.STUDENTS ? TargetType.STUDENTS : TargetType.FEE_DUE;
        TargetSelection selection = new TargetSelection(smsTargetType, null, null, request.getStudentIds(), null, null);
        List<SmsRecipient> recipients = recipientResolver.resolve(schoolId, selection);
        if (recipients.isEmpty()) return ApiResponse.error("No recipients found for the selected target");

        List<String> variableLabels = parseLabels(template.getVariableLabels());
        String name = (request.getName() != null && !request.getName().isBlank())
                ? request.getName().trim()
                : "Fee Reminder - " + request.getTargetType() + " - " + LocalDateTime.now().format(CAMPAIGN_NAME_FORMAT);

        WhatsAppCampaign campaign = WhatsAppCampaign.builder()
                .schoolId(schoolId)
                .name(name)
                .templateId(template.getId())
                .targetType(request.getTargetType())
                .targetFilter(request.getTargetType() == WhatsAppTargetType.STUDENTS
                        ? "studentIds=" + request.getStudentIds() : "feeStatus=PENDING,OVERDUE,PARTIAL")
                .totalRecipients(recipients.size())
                .pendingCount(recipients.size())
                .status(CampaignStatus.PROCESSING)
                .idempotencyKey(blankToNull(request.getIdempotencyKey()))
                .createdBy(createdBy)
                .build();
        campaign = campaignRepository.save(campaign);

        Long campaignId = campaign.getId();
        List<WhatsAppQueueItem> queueItems = new ArrayList<>(recipients.size());
        for (SmsRecipient recipient : recipients) {
            Map<String, Object> perRecipient = new HashMap<>();
            if (request.getVariables() != null) perRecipient.putAll(request.getVariables());
            perRecipient.putIfAbsent("parent_name", "");
            perRecipient.putIfAbsent("student_name", recipient.name() != null ? recipient.name() : "");
            perRecipient.putIfAbsent("name", recipient.name() != null ? recipient.name() : "");
            perRecipient.putIfAbsent("schoolName", schoolName(schoolId));

            List<String> orderedParams = buildOrderedParams(variableLabels, perRecipient);
            queueItems.add(WhatsAppQueueItem.builder()
                    .schoolId(schoolId)
                    .campaignId(campaignId)
                    .studentId(recipient.studentId())
                    .recipientPhone(recipient.phone())
                    .recipientName(recipient.name())
                    .templateId(template.getId())
                    .variablesJson(toJson(orderedParams))
                    .status(QueueStatus.PENDING)
                    .maxAttempts(maxRetryAttempts)
                    .build());
        }
        queueRepository.saveAll(queueItems);
        queueProcessor.triggerImmediateProcessing();

        log.info("[WhatsAppService] Created fee-reminder campaign {} for school {}: {} recipient(s)",
                campaignId, schoolId, recipients.size());
        return ApiResponse.success("Fee reminder queued for " + recipients.size() + " recipient(s)", WhatsAppCampaignResponse.from(campaign));
    }

    /**
     * Fire-and-forget payment confirmation, triggered from {@code AdminService} right after a fee
     * payment is recorded. Never throws — a WhatsApp failure must never affect the payment transaction.
     */
    public void sendPaymentConfirmation(Long schoolId, Long studentId, String recipientPhone, String recipientName, Map<String, Object> vars) {
        sendSingle(schoolId, studentId, recipientPhone, recipientName, WhatsAppCategory.PAYMENT_CONFIRMATION, vars, null);
    }

    /** Fire-and-forget receipt link, sent immediately after {@link #sendPaymentConfirmation}. */
    public void sendReceiptLink(Long schoolId, Long studentId, String recipientPhone, String recipientName, String receiptUrl, Map<String, Object> vars) {
        sendSingle(schoolId, studentId, recipientPhone, recipientName, WhatsAppCategory.RECEIPT_LINK, vars, receiptUrl);
    }

    private void sendSingle(Long schoolId, Long studentId, String recipientPhone, String recipientName,
                             WhatsAppCategory category, Map<String, Object> vars, String buttonUrlParam) {
        try {
            if (!configurationService.isConfigured(schoolId) || recipientPhone == null) return;

            List<WhatsAppTemplate> candidates = templateRepository.findBySchoolIdAndCategoryAndIsActiveTrue(schoolId, category);
            WhatsAppTemplate template = candidates.stream()
                    .filter(t -> t.getApprovalStatus() == WhatsAppApprovalStatus.APPROVED)
                    .findFirst().orElse(null);
            if (template == null) {
                log.info("[WhatsAppService] No approved {} template configured for school {} — skipping", category, schoolId);
                return;
            }

            WhatsAppCampaign campaign = campaignRepository.save(WhatsAppCampaign.builder()
                    .schoolId(schoolId)
                    .name(category + " - " + (recipientName != null ? recipientName : PhoneUtil.mask(recipientPhone)))
                    .templateId(template.getId())
                    .targetType(WhatsAppTargetType.SINGLE)
                    .targetFilter(studentId != null ? "studentId=" + studentId : "phone=" + PhoneUtil.mask(recipientPhone))
                    .totalRecipients(1)
                    .pendingCount(1)
                    .status(CampaignStatus.PROCESSING)
                    .build());

            Map<String, Object> merged = new HashMap<>(vars != null ? vars : Map.of());
            merged.putIfAbsent("parent_name", "");
            merged.putIfAbsent("student_name", recipientName != null ? recipientName : "");
            merged.putIfAbsent("name", recipientName != null ? recipientName : "");

            List<String> orderedParams = buildOrderedParams(parseLabels(template.getVariableLabels()), merged);

            queueRepository.save(WhatsAppQueueItem.builder()
                    .schoolId(schoolId)
                    .campaignId(campaign.getId())
                    .studentId(studentId)
                    .recipientPhone(recipientPhone)
                    .recipientName(recipientName)
                    .templateId(template.getId())
                    .variablesJson(toJson(orderedParams))
                    .buttonUrlParam(buttonUrlParam)
                    .status(QueueStatus.PENDING)
                    .maxAttempts(maxRetryAttempts)
                    .build());
            queueProcessor.triggerImmediateProcessing();
        } catch (Exception e) {
            log.warn("[WhatsAppService] Failed to enqueue {} for school {}: {}", category, schoolId, e.getMessage());
        }
    }

    @Transactional
    public ApiResponse<WhatsAppCampaignResponse> cancelCampaign(Long schoolId, Long campaignId) {
        WhatsAppCampaign campaign = campaignRepository.findByIdAndSchoolId(campaignId, schoolId).orElse(null);
        if (campaign == null) return ApiResponse.error("Campaign not found");
        if (campaign.getStatus() == CampaignStatus.COMPLETED || campaign.getStatus() == CampaignStatus.CANCELLED) {
            return ApiResponse.error("Campaign has already finished and cannot be cancelled");
        }

        int cancelled = queueRepository.cancelPendingByCampaign(campaignId);
        campaign.setPendingCount(Math.max(0, campaign.getPendingCount() - cancelled));
        campaign.setStatus(CampaignStatus.CANCELLED);
        campaign.setCompletedAt(LocalDateTime.now());
        campaign = campaignRepository.save(campaign);

        return ApiResponse.success("Campaign cancelled", WhatsAppCampaignResponse.from(campaign));
    }

    public ApiResponse<Page<WhatsAppCampaignResponse>> getCampaigns(Long schoolId, int page, int size) {
        Page<WhatsAppCampaign> result = campaignRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId, PageRequest.of(page, size));
        return ApiResponse.success(result.map(WhatsAppCampaignResponse::from));
    }

    public ApiResponse<WhatsAppCampaignResponse> getCampaign(Long schoolId, Long id) {
        return campaignRepository.findByIdAndSchoolId(id, schoolId)
                .<ApiResponse<WhatsAppCampaignResponse>>map(c -> ApiResponse.success(WhatsAppCampaignResponse.from(c)))
                .orElse(ApiResponse.error("Campaign not found"));
    }

    public ApiResponse<Page<WhatsAppLog>> getHistory(Long schoolId, String status, LocalDateTime from, LocalDateTime to, String search, int page, int size) {
        WhatsAppLogStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = WhatsAppLogStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ApiResponse.error("Invalid status: " + status);
            }
        }
        Page<WhatsAppLog> result = logRepository.findByFilters(schoolId, statusEnum, from, to, search != null ? search : "", PageRequest.of(page, size));
        result.forEach(entry -> entry.setRecipientPhone(maskPhone(entry.getRecipientPhone())));
        return ApiResponse.success(result);
    }

    /** Dashboard aggregates: today/month volumes, status breakdown, queue depth, quota usage. */
    public ApiResponse<WhatsAppStatsResponse> getStats(Long schoolId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();

        long sentToday = logRepository.countBySchoolIdAndCreatedAtBetween(schoolId, todayStart, now);
        long sentThisMonth = logRepository.countBySchoolIdAndCreatedAtBetween(schoolId, monthStart, now);
        long deliveredThisMonth = logRepository.countBySchoolIdAndStatusAndCreatedAtBetween(schoolId, WhatsAppLogStatus.DELIVERED, monthStart, now);
        long failedThisMonth = logRepository.countBySchoolIdAndStatusAndCreatedAtBetween(schoolId, WhatsAppLogStatus.FAILED, monthStart, now);
        long pendingInQueue = queueRepository.countBySchoolIdAndStatus(schoolId, QueueStatus.PENDING);

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        for (WhatsAppLogStatus s : WhatsAppLogStatus.values()) {
            statusBreakdown.put(s.name(), logRepository.countBySchoolIdAndStatus(schoolId, s));
        }

        List<WhatsAppCampaignResponse> recentCampaigns = campaignRepository
                .findBySchoolIdOrderByCreatedAtDesc(schoolId, PageRequest.of(0, 5))
                .stream().map(WhatsAppCampaignResponse::from).toList();

        Integer quota = schoolRepository.findById(schoolId).map(School::getWhatsappMonthlyQuota).orElse(null);
        boolean quotaBreached = quota != null && sentThisMonth > quota;

        return ApiResponse.success(WhatsAppStatsResponse.builder()
                .sentToday(sentToday)
                .sentThisMonth(sentThisMonth)
                .deliveredThisMonth(deliveredThisMonth)
                .failedThisMonth(failedThisMonth)
                .pendingInQueue(pendingInQueue)
                .statusBreakdown(statusBreakdown)
                .recentCampaigns(recentCampaigns)
                .providerConfigured(configurationService.isConfigured(schoolId))
                .quota(quota)
                .quotaBreached(quotaBreached)
                .build());
    }

    /** Recipient count + sample for the fee-reminder compose UI, without creating a campaign. */
    public ApiResponse<WhatsAppRecipientPreviewResponse> previewRecipients(Long schoolId, WhatsAppTargetType targetType, List<Long> studentIds) {
        if (targetType != WhatsAppTargetType.STUDENTS && targetType != WhatsAppTargetType.FEE_DUE) {
            return ApiResponse.error("Preview only supports STUDENTS or FEE_DUE");
        }
        TargetType smsTargetType = targetType == WhatsAppTargetType.STUDENTS ? TargetType.STUDENTS : TargetType.FEE_DUE;
        TargetSelection selection = new TargetSelection(smsTargetType, null, null, studentIds, null, null);
        List<SmsRecipient> recipients = recipientResolver.resolve(schoolId, selection);

        List<WhatsAppRecipientPreviewResponse.Sample> sample = recipients.stream()
                .limit(10)
                .map(r -> WhatsAppRecipientPreviewResponse.Sample.builder()
                        .studentId(r.studentId())
                        .name(r.name())
                        .phone(r.phone())
                        .build())
                .toList();

        return ApiResponse.success(WhatsAppRecipientPreviewResponse.builder()
                .totalCount(recipients.size())
                .sample(sample)
                .build());
    }

    private String schoolName(Long schoolId) {
        return schoolRepository.findById(schoolId).map(School::getName).orElse("");
    }

    private List<String> parseLabels(String variableLabelsJson) {
        if (variableLabelsJson == null || variableLabelsJson.isBlank()) return List.of();
        try {
            return mapper.readValue(variableLabelsJson, mapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    /** Builds the ordered {{1}}, {{2}}, ... parameter list matching the template's variableLabels. */
    private List<String> buildOrderedParams(List<String> variableLabels, Map<String, Object> values) {
        List<String> ordered = new ArrayList<>(variableLabels.size());
        for (String label : variableLabels) {
            Object v = values.get(label);
            ordered.add(v != null ? v.toString() : "");
        }
        return ordered;
    }

    private String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) return "***";
        return phone.substring(0, phone.length() - 6) + "XXXXXX";
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
