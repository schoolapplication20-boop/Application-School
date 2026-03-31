package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;

/**
 * Base class for all BigQuery repository implementations.
 * Provides shared helpers for executing queries and mapping field values.
 */
public abstract class BigQueryBaseRepository {

    @Autowired
    protected BigQuery bigQuery;

    @Value("${gcp.project.id}")
    protected String projectId;

    @Value("${gcp.bigquery.dataset}")
    protected String dataset;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // BigQuery DATETIME parameter requires: "yyyy-MM-dd HH:mm:ss.SSSSSS"
    private static final DateTimeFormatter DATETIME_WRITE_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS");

    // BigQuery returns DATETIME as "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS[.ffffff]"
    private static final DateTimeFormatter DATETIME_READ_FMT =
            new DateTimeFormatterBuilder()
                .appendPattern("yyyy-MM-dd")
                .optionalStart().appendLiteral('T').optionalEnd()
                .optionalStart().appendLiteral(' ').optionalEnd()
                .appendPattern("HH:mm:ss")
                .optionalStart().appendFraction(ChronoField.NANO_OF_SECOND, 0, 9, true).optionalEnd()
                .toFormatter();

    // ── Table reference ───────────────────────────────────────────────────────

    protected String tableRef(String table) {
        return String.format("`%s.%s.%s`", projectId, dataset, table);
    }

    // ── Query execution ───────────────────────────────────────────────────────

    protected TableResult executeQuery(QueryJobConfiguration config) {
        try {
            return bigQuery.query(config);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("BigQuery query was interrupted", e);
        }
    }

    // ── Field value helpers ───────────────────────────────────────────────────

    protected String str(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            return (val == null || val.isNull()) ? null : val.getStringValue();
        } catch (Exception e) { return null; }
    }

    protected Long longVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            return (val == null || val.isNull()) ? null : val.getLongValue();
        } catch (Exception e) { return null; }
    }

    protected Integer intVal(FieldValueList row, String field) {
        Long l = longVal(row, field);
        return l == null ? null : l.intValue();
    }

    protected Boolean boolVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            return (val == null || val.isNull()) ? null : val.getBooleanValue();
        } catch (Exception e) { return null; }
    }

    protected BigDecimal decimalVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            if (val == null || val.isNull()) return null;
            return new BigDecimal(val.getStringValue());
        } catch (Exception e) { return null; }
    }

    protected LocalDate dateVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            if (val == null || val.isNull()) return null;
            return LocalDate.parse(val.getStringValue(), DATE_FMT);
        } catch (Exception e) { return null; }
    }

    protected LocalDateTime datetimeVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            if (val == null || val.isNull()) return null;
            String raw = val.getStringValue();
            // BigQuery TIMESTAMP columns return epoch microseconds (numeric string)
            try {
                double micros = Double.parseDouble(raw);
                long epochSec = (long) (micros / 1_000_000.0);
                int nanos = (int) ((micros % 1_000_000.0) * 1000);
                return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSec, nanos), ZoneOffset.UTC);
            } catch (NumberFormatException ignored) {
                // BigQuery DATETIME columns return formatted strings
                return LocalDateTime.parse(raw, DATETIME_READ_FMT);
            }
        } catch (Exception e) { return null; }
    }

    // ── QueryParameterValue factories ─────────────────────────────────────────

    protected QueryParameterValue strParam(String value) {
        return value == null
                ? QueryParameterValue.string(null)
                : QueryParameterValue.string(value);
    }

    protected QueryParameterValue int64Param(Long value) {
        return value == null
                ? QueryParameterValue.int64((Long) null)
                : QueryParameterValue.int64(value.longValue());
    }

    protected QueryParameterValue int64Param(Integer value) {
        return value == null
                ? QueryParameterValue.int64((Long) null)
                : QueryParameterValue.int64(value.longValue());
    }

    protected QueryParameterValue boolParam(Boolean value) {
        return value == null
                ? QueryParameterValue.bool(null)
                : QueryParameterValue.bool(value);
    }

    protected QueryParameterValue numericParam(BigDecimal value) {
        return value == null
                ? QueryParameterValue.numeric(null)
                : QueryParameterValue.numeric(value);
    }

    protected QueryParameterValue dateParam(LocalDate value) {
        return value == null
                ? QueryParameterValue.date(null)
                : QueryParameterValue.date(value.format(DATE_FMT));
    }

    protected QueryParameterValue datetimeParam(LocalDateTime value) {
        return value == null
                ? QueryParameterValue.dateTime(null)
                : QueryParameterValue.dateTime(value.format(DATETIME_WRITE_FMT));
    }

    /** For BigQuery TIMESTAMP columns (stores UTC epoch; no timezone in LocalDateTime — uses UTC). */
    protected QueryParameterValue timestampParam(LocalDateTime value) {
        if (value == null) return QueryParameterValue.timestamp((Long) null);
        long epochMicros = value.toEpochSecond(ZoneOffset.UTC) * 1_000_000L
                + value.getNano() / 1000L;
        return QueryParameterValue.timestamp(epochMicros);
    }

    /** Reads a BigQuery TIMESTAMP column into LocalDateTime (interpreted as UTC). */
    protected LocalDateTime timestampVal(FieldValueList row, String field) {
        try {
            FieldValue val = row.get(field);
            if (val == null || val.isNull()) return null;
            // BigQuery returns TIMESTAMP as microseconds since epoch (numeric string)
            String raw = val.getStringValue();
            try {
                double micros = Double.parseDouble(raw);
                long epochSec = (long) (micros / 1_000_000.0);
                int nanos = (int) ((micros % 1_000_000.0) * 1000);
                return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSec, nanos), ZoneOffset.UTC);
            } catch (NumberFormatException e) {
                // Fallback: parse as formatted timestamp string
                return LocalDateTime.parse(raw.replace(" UTC", "").replace(" ", "T").replaceAll("\\+.*", ""),
                        DATETIME_READ_FMT);
            }
        } catch (Exception e) { return null; }
    }

    protected Long generateNextId(String tableName) {
        String sql = String.format("SELECT COALESCE(MAX(id), 0) + 1 FROM %s", tableRef(tableName));
        QueryJobConfiguration config = QueryJobConfiguration.newBuilder(sql).build();
        TableResult result = executeQuery(config);
        FieldValueList row = result.iterateAll().iterator().next();
        FieldValue val = row.get(0);
        return (val == null || val.isNull()) ? 1L : val.getLongValue();
    }

    protected java.time.LocalDateTime now() {
        return java.time.LocalDateTime.now();
    }
}
