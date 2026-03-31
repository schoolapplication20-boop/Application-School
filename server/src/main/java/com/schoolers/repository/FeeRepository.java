package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Fee;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.*;

@Repository
public class FeeRepository extends BigQueryBaseRepository {
    private static final String T = "fees";
    private String tbl() { return tableRef(T); }

    private Fee map(FieldValueList r) {
        Fee f = new Fee();
        f.setId(longVal(r, "id"));
        f.setStudentId(longVal(r, "student_id"));
        f.setStudentName(str(r, "student_name"));
        f.setRollNumber(str(r, "roll_number"));
        f.setClassName(str(r, "class_name"));
        f.setAmount(decimalVal(r, "amount"));
        f.setFeeType(str(r, "fee_type"));
        String statusStr = str(r, "status");
        f.setStatus(statusStr != null ? Fee.Status.valueOf(statusStr) : null);
        f.setDueDate(dateVal(r, "due_date"));
        f.setPaidDate(dateVal(r, "paid_date"));
        f.setPaymentMethod(str(r, "payment_method"));
        f.setTransactionId(str(r, "transaction_id"));
        f.setPaidAmount(decimalVal(r, "paid_amount"));
        f.setReceiptNumber(str(r, "receipt_number"));
        f.setReceivedBy(str(r, "received_by"));
        f.setRemarks(str(r, "remarks"));
        f.setCreatedAt(datetimeVal(r, "created_at"));
        f.setUpdatedAt(datetimeVal(r, "updated_at"));
        return f;
    }

    public Fee save(Fee f) {
        if (f.getId() == null) {
            f.setId(generateNextId(T));
            f.setCreatedAt(now());
            f.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,student_id,student_name,roll_number,class_name,amount,fee_type,status,due_date,paid_date,payment_method,transaction_id,paid_amount,receipt_number,received_by,remarks,created_at,updated_at) VALUES (@id,@sid,@sname,@roll,@cls,@amount,@ftype,@status,@duedate,@paiddate,@pmeth,@txid,@paidamt,@receipt,@recby,@remarks,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(f.getId()))
                .addNamedParameter("sid", int64Param(f.getStudentId()))
                .addNamedParameter("sname", strParam(f.getStudentName()))
                .addNamedParameter("roll", strParam(f.getRollNumber()))
                .addNamedParameter("cls", strParam(f.getClassName()))
                .addNamedParameter("amount", numericParam(f.getAmount()))
                .addNamedParameter("ftype", strParam(f.getFeeType()))
                .addNamedParameter("status", strParam(f.getStatus() != null ? f.getStatus().name() : null))
                .addNamedParameter("duedate", dateParam(f.getDueDate()))
                .addNamedParameter("paiddate", dateParam(f.getPaidDate()))
                .addNamedParameter("pmeth", strParam(f.getPaymentMethod()))
                .addNamedParameter("txid", strParam(f.getTransactionId()))
                .addNamedParameter("paidamt", numericParam(f.getPaidAmount()))
                .addNamedParameter("receipt", strParam(f.getReceiptNumber()))
                .addNamedParameter("recby", strParam(f.getReceivedBy()))
                .addNamedParameter("remarks", strParam(f.getRemarks()))
                .addNamedParameter("ca", datetimeParam(f.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(f.getUpdatedAt()))
                .build());
        } else {
            f.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET student_id=@sid,student_name=@sname,roll_number=@roll,class_name=@cls,amount=@amount,fee_type=@ftype,status=@status,due_date=@duedate,paid_date=@paiddate,payment_method=@pmeth,transaction_id=@txid,paid_amount=@paidamt,receipt_number=@receipt,received_by=@recby,remarks=@remarks,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(f.getId()))
                .addNamedParameter("sid", int64Param(f.getStudentId()))
                .addNamedParameter("sname", strParam(f.getStudentName()))
                .addNamedParameter("roll", strParam(f.getRollNumber()))
                .addNamedParameter("cls", strParam(f.getClassName()))
                .addNamedParameter("amount", numericParam(f.getAmount()))
                .addNamedParameter("ftype", strParam(f.getFeeType()))
                .addNamedParameter("status", strParam(f.getStatus() != null ? f.getStatus().name() : null))
                .addNamedParameter("duedate", dateParam(f.getDueDate()))
                .addNamedParameter("paiddate", dateParam(f.getPaidDate()))
                .addNamedParameter("pmeth", strParam(f.getPaymentMethod()))
                .addNamedParameter("txid", strParam(f.getTransactionId()))
                .addNamedParameter("paidamt", numericParam(f.getPaidAmount()))
                .addNamedParameter("receipt", strParam(f.getReceiptNumber()))
                .addNamedParameter("recby", strParam(f.getReceivedBy()))
                .addNamedParameter("remarks", strParam(f.getRemarks()))
                .addNamedParameter("ua", datetimeParam(f.getUpdatedAt()))
                .build());
        }
        return f;
    }

    public Optional<Fee> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Fee> findAll() {
        List<Fee> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public List<Fee> findByStudentId(Long studentId) {
        List<Fee> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid")
            .addNamedParameter("sid", int64Param(studentId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Fee> findByStudentIdAndStatus(Long studentId, Fee.Status status) {
        List<Fee> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid AND status=@status")
            .addNamedParameter("sid", int64Param(studentId))
            .addNamedParameter("status", strParam(status.name())).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Fee> findByStatus(Fee.Status status) {
        List<Fee> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE status=@status")
            .addNamedParameter("status", strParam(status.name())).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public boolean existsByReceiptNumber(String receiptNumber) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE receipt_number=@receipt")
            .addNamedParameter("receipt", strParam(receiptNumber)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public List<Fee> findByStudentIdOrderByCreatedAtDesc(Long studentId) {
        List<Fee> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid ORDER BY created_at DESC")
            .addNamedParameter("sid", int64Param(studentId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public BigDecimal sumPaidFees() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COALESCE(SUM(paid_amount), 0) as total FROM " + tbl() + " WHERE status='PAID'").build());
        return decimalVal(r.iterateAll().iterator().next(), "total");
    }

    public BigDecimal sumPendingFees() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as total FROM " + tbl() + " WHERE status IN ('PENDING','OVERDUE','PARTIAL')").build());
        return decimalVal(r.iterateAll().iterator().next(), "total");
    }

    public BigDecimal sumPaidFeesByMonth(int month, int year) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COALESCE(SUM(paid_amount), 0) as total FROM " + tbl() + " WHERE status='PAID' AND EXTRACT(MONTH FROM paid_date)=@month AND EXTRACT(YEAR FROM paid_date)=@year")
            .addNamedParameter("month", int64Param((long) month))
            .addNamedParameter("year", int64Param((long) year)).build());
        return decimalVal(r.iterateAll().iterator().next(), "total");
    }

    public boolean existsById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public void deleteByStudentId(Long studentId) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE student_id=@sid")
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
