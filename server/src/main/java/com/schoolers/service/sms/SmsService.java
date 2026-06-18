package com.schoolers.service.sms;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.sms.RecipientPreviewResponse;
import com.schoolers.dto.sms.SmsBulkSendRequest;
import com.schoolers.dto.sms.SmsCampaignResponse;
import com.schoolers.dto.sms.SmsSendRequest;
import com.schoolers.dto.sms.SmsStatsResponse;
import com.schoolers.model.School;
import com.schoolers.model.Student;
import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.QueueStatus;
import com.schoolers.model.sms.SmsCampaign;
import com.schoolers.model.sms.SmsLog;
import com.schoolers.model.sms.SmsLogStatus;
import com.schoolers.model.sms.SmsQueueItem;
import com.schoolers.model.sms.SmsTemplate;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.sms.SmsCampaignRepository;
import com.schoolers.repository.sms.SmsLogRepository;
import com.schoolers.repository.sms.SmsQueueRepository;
import com.schoolers.repository.sms.SmsTemplateRepository;
import com.schoolers.sms.PhoneUtil;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates SMS sending: resolves recipients/content, creates {@link SmsCampaign} +
 * {@link SmsQueueItem} rows, and exposes dashboard/history queries. Actual sending happens
 * asynchronously in {@link SmsQueueProcessor} — this service only enqueues work and (for
 * immediate sends) nudges the processor to run right away.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);
    private static final DateTimeFormatter CAMPAIGN_NAME_FORMAT = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");

    private final SmsCampaignRepository campaignRepository;
    private final SmsQueueRepository queueRepository;
    private final SmsLogRepository logRepository;
    private final SmsTemplateRepository templateRepository;
    private final SmsTemplateService templateService;
    private final SmsRecipientResolver recipientResolver;
    private final StudentRepository studentRepository;
    private final SchoolRepository schoolRepository;
    private final SmsProviderSettingsService providerSettingsService;
    private final SmsQueueProcessor queueProcessor;

    @Value("${sms.default.country.code:+91}")
    private String defaultCountryCode;

    @Value("${sms.max.retry.attempts:3}")
    private int maxRetryAttempts;

    public SmsService(SmsCampaignRepository campaignRepository,
                       SmsQueueRepository queueRepository,
                       SmsLogRepository logRepository,
                       SmsTemplateRepository templateRepository,
                       SmsTemplateService templateService,
                       SmsRecipientResolver recipientResolver,
                       StudentRepository studentRepository,
                       SchoolRepository schoolRepository,
                       SmsProviderSettingsService providerSettingsService,
                       SmsQueueProcessor queueProcessor) {
        this.campaignRepository = campaignRepository;
        this.queueRepository = queueRepository;
        this.logRepository = logRepository;
        this.templateRepository = templateRepository;
        this.templateService = templateService;
        this.recipientResolver = recipientResolver;
        this.studentRepository = studentRepository;
        this.schoolRepository = schoolRepository;
        this.providerSettingsService = providerSettingsService;
        this.queueProcessor = queueProcessor;
    }

    /** Resolves the school's display name for the {@code {{schoolName}}} template variable, or "" if unavailable. */
    private String schoolName(Long schoolId) {
        return schoolRepository.findById(schoolId).map(School::getName).orElse("");
    }

    /** Queues a single SMS to a student's parent (resolved by {@code studentId}) or a raw phone number. */
    @Transactional
    public ApiResponse<SmsCampaignResponse> sendSingle(Long schoolId, Long createdBy, SmsSendRequest request) {
        if (!providerSettingsService.isConfigured(schoolId)) {
            return ApiResponse.error("SMS provider not configured — go to SMS → Settings to add your MSG91 credentials");
        }
        String recipientPhone;
        String recipientName = null;
        Long studentId = null;

        if (request.getStudentId() != null) {
            Student student = studentRepository.findById(request.getStudentId()).orElse(null);
            if (student == null || !schoolId.equals(student.getSchoolId())) {
                return ApiResponse.error("Student not found");
            }
            if (!Boolean.TRUE.equals(student.getIsActive())) {
                return ApiResponse.error("Student is not active");
            }
            String raw = firstNonBlank(student.getParentMobile(), student.getMotherMobile(), student.getGuardianMobile());
            recipientPhone = PhoneUtil.normalize(raw, defaultCountryCode);
            if (recipientPhone == null) {
                return ApiResponse.error("Student has no valid parent/guardian phone number on file");
            }
            recipientName = student.getName();
            studentId = student.getId();
        } else if (request.getPhone() != null && !request.getPhone().isBlank()) {
            recipientPhone = PhoneUtil.normalize(request.getPhone(), defaultCountryCode);
            if (recipientPhone == null) {
                return ApiResponse.error("Invalid phone number: " + request.getPhone());
            }
        } else {
            return ApiResponse.error("Either studentId or phone is required");
        }

        ApiResponse<String> rawContentResult = resolveRawContent(schoolId, request.getTemplateId(), request.getMessage());
        if (!rawContentResult.isSuccess()) {
            return ApiResponse.error(rawContentResult.getMessage());
        }

        Map<String, Object> recipientVars = new HashMap<>();
        if (request.getVariables() != null) recipientVars.putAll(request.getVariables());
        recipientVars.putIfAbsent("name", recipientName != null ? recipientName : "");
        recipientVars.putIfAbsent("schoolName", schoolName(schoolId));
        String finalContent = templateService.render(rawContentResult.getData(), recipientVars);

        LocalDateTime scheduledFor = request.getScheduledFor();
        CampaignStatus status = isFutureSchedule(scheduledFor) ? CampaignStatus.SCHEDULED : CampaignStatus.PROCESSING;

        SmsCampaign campaign = SmsCampaign.builder()
                .schoolId(schoolId)
                .name("SMS to " + (recipientName != null ? recipientName : PhoneUtil.mask(recipientPhone)))
                .templateId(request.getTemplateId())
                .messageContent(finalContent)
                .targetType(studentId != null ? com.schoolers.model.sms.TargetType.STUDENTS : com.schoolers.model.sms.TargetType.CUSTOM)
                .targetFilter(studentId != null ? "studentId=" + studentId : "phone=" + PhoneUtil.mask(recipientPhone))
                .totalRecipients(1)
                .pendingCount(1)
                .status(status)
                .scheduledFor(scheduledFor)
                .createdBy(createdBy)
                .build();
        campaign = campaignRepository.save(campaign);

        SmsQueueItem queueItem = SmsQueueItem.builder()
                .schoolId(schoolId)
                .campaignId(campaign.getId())
                .studentId(studentId)
                .recipientPhone(recipientPhone)
                .recipientName(recipientName)
                .messageContent(finalContent)
                .status(QueueStatus.PENDING)
                .scheduledFor(scheduledFor)
                .maxAttempts(maxRetryAttempts)
                .build();
        queueRepository.save(queueItem);

        if (scheduledFor == null) {
            queueProcessor.triggerImmediateProcessing();
        }

        log.info("[SmsService] Queued single SMS for school {} to {} (campaignId={}, scheduled={})",
                schoolId, PhoneUtil.mask(recipientPhone), campaign.getId(), scheduledFor != null);
        return ApiResponse.success("SMS queued for delivery", SmsCampaignResponse.from(campaign));
    }

    /** Resolves recipients for {@code request.targetType} and queues a campaign, deduping repeat submissions via {@code idempotencyKey}. */
    @Transactional
    public ApiResponse<SmsCampaignResponse> sendBulk(Long schoolId, Long createdBy, SmsBulkSendRequest request) {
        if (!providerSettingsService.isConfigured(schoolId)) {
            return ApiResponse.error("SMS provider not configured — go to SMS → Settings to add your MSG91 credentials");
        }
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existing = campaignRepository.findBySchoolIdAndIdempotencyKey(schoolId, request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                log.info("[SmsService] Idempotent replay for school {} key={} -> campaignId={}",
                        schoolId, request.getIdempotencyKey(), existing.get().getId());
                return ApiResponse.success("Campaign already exists for this request", SmsCampaignResponse.from(existing.get()));
            }
        }

        if (request.getTargetType() == null) {
            return ApiResponse.error("targetType is required");
        }

        TargetSelection selection = new TargetSelection(
                request.getTargetType(), request.getClassName(), request.getSection(),
                request.getStudentIds(), request.getCustomPhones(), request.getDate());
        List<SmsRecipient> recipients = recipientResolver.resolve(schoolId, selection);
        if (recipients.isEmpty()) {
            return ApiResponse.error("No recipients found for the selected target");
        }

        ApiResponse<String> rawContentResult = resolveRawContent(schoolId, request.getTemplateId(), request.getMessage());
        if (!rawContentResult.isSuccess()) {
            return ApiResponse.error(rawContentResult.getMessage());
        }
        Map<String, Object> campaignVars = new HashMap<>();
        if (request.getVariables() != null) campaignVars.putAll(request.getVariables());
        campaignVars.putIfAbsent("schoolName", schoolName(schoolId));
        String baseContent = templateService.render(rawContentResult.getData(), campaignVars);

        LocalDateTime scheduledFor = request.getScheduledFor();
        CampaignStatus status = isFutureSchedule(scheduledFor) ? CampaignStatus.SCHEDULED : CampaignStatus.PROCESSING;

        String name = (request.getName() != null && !request.getName().isBlank())
                ? request.getName().trim()
                : "Bulk SMS - " + request.getTargetType() + " - " + LocalDateTime.now().format(CAMPAIGN_NAME_FORMAT);

        SmsCampaign campaign = SmsCampaign.builder()
                .schoolId(schoolId)
                .name(name)
                .templateId(request.getTemplateId())
                .messageContent(baseContent)
                .targetType(request.getTargetType())
                .targetFilter(describeTarget(request))
                .totalRecipients(recipients.size())
                .pendingCount(recipients.size())
                .status(status)
                .scheduledFor(scheduledFor)
                .idempotencyKey(blankToNull(request.getIdempotencyKey()))
                .createdBy(createdBy)
                .build();
        campaign = campaignRepository.save(campaign);

        Long campaignId = campaign.getId();
        List<SmsQueueItem> queueItems = new ArrayList<>(recipients.size());
        for (SmsRecipient recipient : recipients) {
            String personalizedContent = templateService.render(baseContent,
                    Map.of("name", recipient.name() != null ? recipient.name() : ""));
            queueItems.add(SmsQueueItem.builder()
                    .schoolId(schoolId)
                    .campaignId(campaignId)
                    .studentId(recipient.studentId())
                    .recipientPhone(recipient.phone())
                    .recipientName(recipient.name())
                    .messageContent(personalizedContent)
                    .status(QueueStatus.PENDING)
                    .scheduledFor(scheduledFor)
                    .maxAttempts(maxRetryAttempts)
                    .build());
        }
        queueRepository.saveAll(queueItems);

        if (scheduledFor == null) {
            queueProcessor.triggerImmediateProcessing();
        }

        log.info("[SmsService] Created campaign {} for school {}: {} recipient(s), status={}, scheduled={}",
                campaignId, schoolId, recipients.size(), status, scheduledFor);
        return ApiResponse.success("Campaign created with " + recipients.size() + " recipient(s)", SmsCampaignResponse.from(campaign));
    }

    /** Cancels all still-pending messages in a campaign. Messages already sent or in flight are unaffected. */
    @Transactional
    public ApiResponse<SmsCampaignResponse> cancelCampaign(Long schoolId, Long campaignId) {
        SmsCampaign campaign = campaignRepository.findByIdAndSchoolId(campaignId, schoolId).orElse(null);
        if (campaign == null) return ApiResponse.error("Campaign not found");
        if (campaign.getStatus() == CampaignStatus.COMPLETED || campaign.getStatus() == CampaignStatus.CANCELLED) {
            return ApiResponse.error("Campaign has already finished and cannot be cancelled");
        }

        int cancelled = queueRepository.cancelPendingByCampaign(campaignId);
        campaign.setPendingCount(Math.max(0, campaign.getPendingCount() - cancelled));
        campaign.setStatus(CampaignStatus.CANCELLED);
        campaign.setCompletedAt(LocalDateTime.now());
        campaign = campaignRepository.save(campaign);

        log.info("[SmsService] Cancelled campaign {} for school {} ({} pending message(s) cancelled)", campaignId, schoolId, cancelled);
        return ApiResponse.success("Campaign cancelled", SmsCampaignResponse.from(campaign));
    }

    public ApiResponse<Page<SmsCampaignResponse>> getCampaigns(Long schoolId, int page, int size) {
        Page<SmsCampaign> result = campaignRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId, PageRequest.of(page, size));
        return ApiResponse.success(result.map(SmsCampaignResponse::from));
    }

    public ApiResponse<SmsCampaignResponse> getCampaign(Long schoolId, Long id) {
        return campaignRepository.findByIdAndSchoolId(id, schoolId)
                .<ApiResponse<SmsCampaignResponse>>map(c -> ApiResponse.success(SmsCampaignResponse.from(c)))
                .orElse(ApiResponse.error("Campaign not found"));
    }

    /** Campaigns that are still scheduled or actively processing, for the "Scheduled" tab. */
    public ApiResponse<List<SmsCampaignResponse>> getActiveCampaigns(Long schoolId) {
        List<SmsCampaign> campaigns = campaignRepository.findBySchoolIdAndStatusInOrderByCreatedAtDesc(
                schoolId, List.of(CampaignStatus.SCHEDULED, CampaignStatus.PROCESSING));
        return ApiResponse.success(campaigns.stream().map(SmsCampaignResponse::from).toList());
    }

    /** Paginated delivery log, filterable by status/date range/search (recipient name or phone). */
    public ApiResponse<Page<SmsLog>> getHistory(Long schoolId, String status, LocalDateTime from, LocalDateTime to, String search, int page, int size) {
        SmsLogStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = SmsLogStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ApiResponse.error("Invalid status: " + status);
            }
        }
        Page<SmsLog> result = logRepository.findByFilters(schoolId, statusEnum, from, to, search != null ? search : "", PageRequest.of(page, size));
        return ApiResponse.success(result);
    }

    /** Dashboard aggregates: today/month volumes, status breakdown, queue depth, recent campaigns. */
    public ApiResponse<SmsStatsResponse> getStats(Long schoolId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay();

        long sentToday = logRepository.countBySchoolIdAndCreatedAtBetween(schoolId, todayStart, now);
        long sentThisMonth = logRepository.countBySchoolIdAndCreatedAtBetween(schoolId, monthStart, now);
        long deliveredThisMonth = logRepository.countBySchoolIdAndStatusAndCreatedAtBetween(schoolId, SmsLogStatus.DELIVERED, monthStart, now);
        long failedThisMonth = logRepository.countBySchoolIdAndStatusAndCreatedAtBetween(schoolId, SmsLogStatus.FAILED, monthStart, now)
                + logRepository.countBySchoolIdAndStatusAndCreatedAtBetween(schoolId, SmsLogStatus.UNDELIVERED, monthStart, now);
        long pendingInQueue = queueRepository.countBySchoolIdAndStatus(schoolId, QueueStatus.PENDING);

        Map<String, Long> statusBreakdown = new LinkedHashMap<>();
        for (SmsLogStatus s : SmsLogStatus.values()) {
            statusBreakdown.put(s.name(), logRepository.countBySchoolIdAndStatus(schoolId, s));
        }

        List<SmsCampaignResponse> recentCampaigns = campaignRepository.findRecentBySchoolId(schoolId, PageRequest.of(0, 5))
                .stream().map(SmsCampaignResponse::from).toList();

        return ApiResponse.success(SmsStatsResponse.builder()
                .sentToday(sentToday)
                .sentThisMonth(sentThisMonth)
                .deliveredThisMonth(deliveredThisMonth)
                .failedThisMonth(failedThisMonth)
                .pendingInQueue(pendingInQueue)
                .statusBreakdown(statusBreakdown)
                .recentCampaigns(recentCampaigns)
                .providerConfigured(providerSettingsService.isConfigured(schoolId))
                .providerName(providerSettingsService.getProviderName(schoolId))
                .build());
    }

    /** Recipient count + sample for the compose UI, without creating a campaign. */
    public ApiResponse<RecipientPreviewResponse> previewRecipients(Long schoolId, TargetSelection selection) {
        if (selection.targetType() == null) return ApiResponse.error("targetType is required");

        List<SmsRecipient> recipients = recipientResolver.resolve(schoolId, selection);
        List<RecipientPreviewResponse.Sample> sample = recipients.stream()
                .limit(10)
                .map(r -> RecipientPreviewResponse.Sample.builder()
                        .studentId(r.studentId())
                        .name(r.name())
                        .phone(r.phone())
                        .build())
                .toList();

        return ApiResponse.success(RecipientPreviewResponse.builder()
                .totalCount(recipients.size())
                .sample(sample)
                .build());
    }

    private ApiResponse<String> resolveRawContent(Long schoolId, Long templateId, String message) {
        if (templateId != null) {
            SmsTemplate template = templateRepository.findByIdAndSchoolId(templateId, schoolId).orElse(null);
            if (template == null) return ApiResponse.error("Template not found");
            if (!Boolean.TRUE.equals(template.getIsActive())) return ApiResponse.error("Template is inactive");
            return ApiResponse.success(template.getContent());
        }
        if (message != null && !message.isBlank()) return ApiResponse.success(message);
        return ApiResponse.error("Either templateId or message is required");
    }

    private String describeTarget(SmsBulkSendRequest request) {
        switch (request.getTargetType()) {
            case CLASS:
                return "className=" + request.getClassName();
            case SECTION:
                return "className=" + request.getClassName() + ", section=" + request.getSection();
            case STUDENTS:
                return "studentIds=" + request.getStudentIds();
            case CUSTOM:
                return "customPhones=" + (request.getCustomPhones() != null ? request.getCustomPhones().size() : 0) + " number(s)";
            case ABSENTEES:
                return "date=" + (request.getDate() != null ? request.getDate() : LocalDate.now());
            case FEE_DUE:
                return "feeStatus=PENDING,OVERDUE,PARTIAL";
            case SCHOOL:
            default:
                return "all students";
        }
    }

    private boolean isFutureSchedule(LocalDateTime scheduledFor) {
        return scheduledFor != null && scheduledFor.isAfter(LocalDateTime.now());
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
