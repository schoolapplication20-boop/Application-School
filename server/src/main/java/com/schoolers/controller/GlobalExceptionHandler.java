package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String msg = "A duplicate entry was detected. Please check your input and try again.";
        if (ex.getMostSpecificCause() != null) {
            String detail = ex.getMostSpecificCause().getMessage();
            if (detail != null) {
                String lower = detail.toLowerCase();
                // ── Foreign-key violations ─────────────────────────────────────────
                if (lower.contains("violates foreign key constraint")) {
                    if (lower.contains("school_diary_config")) {
                        msg = "Configuration could not be saved: school reference is invalid. Please contact support.";
                    } else if (lower.contains("coordinator_user_id")) {
                        msg = "The selected coordinator user was not found. Please verify the email and try again.";
                    } else {
                        msg = "A required reference was not found. Please check your input and try again.";
                    }
                // ── Unique / PK violations ─────────────────────────────────────────
                } else if (lower.contains("uq_classrooms_name_section_school")
                        || lower.contains("classrooms_class_name") || lower.contains("class_name")) {
                    msg = "This class/section already exists in your school";
                } else if (lower.contains("uk_users_email") || lower.contains("users_email")) {
                    msg = "An account with this email already exists.";
                } else if (lower.contains("receipt_number") || lower.contains("fee_payments_receipt")) {
                    msg = "Receipt number conflict. Please click Collect again to generate a new receipt.";
                } else if (lower.contains("fee_payments") || lower.contains("fee_installments")
                        || lower.contains("fee_payment") || lower.contains("payment")
                        || (lower.contains("assignment_id") && lower.contains("student_id"))
                        || (lower.contains("student_id") && lower.contains("term"))) {
                    msg = "Payment could not be recorded — a database constraint was violated. Please try again or contact support.";
                }
                log.warn("[DataIntegrity] {}", detail);
            }
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(msg));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<?>> handleOptimisticLock(OptimisticLockingFailureException ex) {
        log.warn("[OptimisticLock] {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("This record was just updated by another request. Please refresh and try again."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(message));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<?>> handleConstraintViolation(jakarta.validation.ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
        log.warn("[ConstraintViolation] {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(message));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<?>> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Required parameter '" + ex.getParameterName() + "' is missing."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<?>> handleBadRequest(HttpMessageNotReadableException ex) {
        log.warn("[BadRequest] {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Invalid request body. Please check your input and try again."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<?>> handleIllegalArg(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Endpoint not found."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Access denied. You do not have permission to perform this action."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGeneral(Exception ex) {
        log.error("[UnhandledException] {}: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred. Please try again or contact support."));
    }
}
