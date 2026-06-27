package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "import_type", length = 20, nullable = false)
    private String importType;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "imported_by")
    private Long importedBy;

    @Column(name = "imported_by_name", length = 100)
    private String importedByName;

    @Column(name = "total_rows")
    private int totalRows;

    @Column(name = "imported_rows")
    private int importedRows;

    @Column(name = "failed_rows")
    private int failedRows;

    @Column(name = "duplicate_rows")
    private int duplicateRows;

    @Column(name = "failed_rows_json", columnDefinition = "TEXT")
    private String failedRowsJson;

    @Column(length = 20)
    @Builder.Default
    private String status = "COMPLETED";

    /** Rows processed so far (updated every 50 rows by the async worker). */
    @Column(name = "processed_rows")
    @Builder.Default
    private int processedRows = 0;

    /** JSON array of StudentCredentialDto — populated after async import completes. */
    @Column(name = "credentials_json", columnDefinition = "TEXT")
    private String credentialsJson;

    @CreationTimestamp
    @Column(name = "imported_at", updatable = false)
    private LocalDateTime importedAt;
}
