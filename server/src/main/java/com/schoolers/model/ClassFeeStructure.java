package com.schoolers.model;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "class_fee_structure",
       uniqueConstraints = @UniqueConstraint(name = "uq_class_fee_name_year_school", columnNames = {"class_name", "academic_year", "school_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassFeeStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_name", nullable = false, length = 30)
    private String className;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "tuition_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal tuitionFee = BigDecimal.ZERO;

    @Column(name = "transport_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal transportFee = BigDecimal.ZERO;

    @Column(name = "lab_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal labFee = BigDecimal.ZERO;

    @Column(name = "exam_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal examFee = BigDecimal.ZERO;

    @Column(name = "sports_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal sportsFee = BigDecimal.ZERO;

    @Column(name = "other_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal otherFee = BigDecimal.ZERO;

    /**
     * Optional class-level term-wise split, stored as a JSON array of
     * {"termName": ..., "amount": ...} objects. Use getTermFees()/setTermFees()
     * for the parsed form; this raw column is only used for persistence.
     */
    @Column(name = "term_fees", columnDefinition = "TEXT")
    private String termFeesJson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    private static final ObjectMapper TERM_FEES_MAPPER = new ObjectMapper();

    /** Parses the stored term-fee JSON into a list of {termName, amount} maps. Empty if unset/invalid. */
    @Transient
    public List<Map<String, Object>> getTermFees() {
        if (termFeesJson == null || termFeesJson.isBlank()) return Collections.emptyList();
        try {
            return TERM_FEES_MAPPER.readValue(termFeesJson, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /** Serializes a list of {termName, amount} maps into the stored JSON column. */
    public void setTermFees(List<Map<String, Object>> breakup) {
        if (breakup == null || breakup.isEmpty()) { this.termFeesJson = null; return; }
        try {
            this.termFeesJson = TERM_FEES_MAPPER.writeValueAsString(breakup);
        } catch (Exception e) {
            this.termFeesJson = null;
        }
    }

    public BigDecimal getTotalFee() {
        BigDecimal total = BigDecimal.ZERO;
        if (tuitionFee  != null) total = total.add(tuitionFee);
        if (transportFee!= null) total = total.add(transportFee);
        if (labFee      != null) total = total.add(labFee);
        if (examFee     != null) total = total.add(examFee);
        if (sportsFee   != null) total = total.add(sportsFee);
        if (otherFee    != null) total = total.add(otherFee);
        return total;
    }
}
