package com.schoolers.model.whatsapp;

/**
 * Whether a template's underlying Meta message template has been approved on Meta's side.
 * Set manually by the school admin — Phase 1 does not poll Meta's template management API.
 */
public enum WhatsAppApprovalStatus {
    PENDING, APPROVED, REJECTED
}
