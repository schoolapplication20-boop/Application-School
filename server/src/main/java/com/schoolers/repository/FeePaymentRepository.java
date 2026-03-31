package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.FeePayment;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class FeePaymentRepository extends BigQueryBaseRepository {
    private static final String T = "fee_payments";
    private String tbl() { return tableRef(T); }

    private FeePayment map(FieldValueList r) {
        FeePayment fp = new FeePayment();
        fp.setId(longVal(r, "id"));
        fp.setFeeId(longVal(r, "fee_id"));
        fp.setStudentId(longVal(r, "student_id"));
        fp.setStudentName(str(r, "student_name"));
        fp.setRollNumber(str(r, "roll_number"));
        fp.setClassName(str(r, "class_name"));
        fp.setFeeType(str(r, "fee_type"));
        fp.setAmountPaid(decimalVal(r, "amount_paid"));
        fp.setPaymentDate(dateVal(r, "payment_date"));
        fp.setPaymentMode(str(r, "payment_mode"));
        fp.setReceiptNumber(str(r, "receipt_number"));
        fp.setReceivedBy(str(r, "received_by"));
        fp.setRemarks(str(r, "remarks"));
        fp.setCreatedAt(datetimeVal(r, "created_at"));
        return fp;
    }

    public FeePayment save(FeePayment fp) {
        if (fp.getId() == null) {
            fp.setId(generateNextId(T));
            fp.setCreatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,fee_id,student_id,student_name,roll_number,class_name,fee_type,amount_paid,payment_date,payment_mode,receipt_number,received_by,remarks,created_at) VALUES (@id,@fid,@sid,@sname,@roll,@cls,@ftype,@amt,@pdate,@pmode,@receipt,@recby,@remarks,@ca)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(fp.getId()))
                .addNamedParameter("fid", int64Param(fp.getFeeId()))
                .addNamedParameter("sid", int64Param(fp.getStudentId()))
                .addNamedParameter("sname", strParam(fp.getStudentName()))
                .addNamedParameter("roll", strParam(fp.getRollNumber()))
                .addNamedParameter("cls", strParam(fp.getClassName()))
                .addNamedParameter("ftype", strParam(fp.getFeeType()))
                .addNamedParameter("amt", numericParam(fp.getAmountPaid()))
                .addNamedParameter("pdate", dateParam(fp.getPaymentDate()))
                .addNamedParameter("pmode", strParam(fp.getPaymentMode()))
                .addNamedParameter("receipt", strParam(fp.getReceiptNumber()))
                .addNamedParameter("recby", strParam(fp.getReceivedBy()))
                .addNamedParameter("remarks", strParam(fp.getRemarks()))
                .addNamedParameter("ca", datetimeParam(fp.getCreatedAt()))
                .build());
        } else {
            String sql = "UPDATE " + tbl() + " SET fee_id=@fid,student_id=@sid,student_name=@sname,roll_number=@roll,class_name=@cls,fee_type=@ftype,amount_paid=@amt,payment_date=@pdate,payment_mode=@pmode,receipt_number=@receipt,received_by=@recby,remarks=@remarks WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(fp.getId()))
                .addNamedParameter("fid", int64Param(fp.getFeeId()))
                .addNamedParameter("sid", int64Param(fp.getStudentId()))
                .addNamedParameter("sname", strParam(fp.getStudentName()))
                .addNamedParameter("roll", strParam(fp.getRollNumber()))
                .addNamedParameter("cls", strParam(fp.getClassName()))
                .addNamedParameter("ftype", strParam(fp.getFeeType()))
                .addNamedParameter("amt", numericParam(fp.getAmountPaid()))
                .addNamedParameter("pdate", dateParam(fp.getPaymentDate()))
                .addNamedParameter("pmode", strParam(fp.getPaymentMode()))
                .addNamedParameter("receipt", strParam(fp.getReceiptNumber()))
                .addNamedParameter("recby", strParam(fp.getReceivedBy()))
                .addNamedParameter("remarks", strParam(fp.getRemarks()))
                .build());
        }
        return fp;
    }

    public List<FeePayment> findAll() {
        List<FeePayment> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<FeePayment> findByStudentIdOrderByPaymentDateDescCreatedAtDesc(Long studentId) {
        List<FeePayment> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE student_id=@sid ORDER BY payment_date DESC, created_at DESC")
            .addNamedParameter("sid", int64Param(studentId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public boolean existsByReceiptNumber(String receiptNumber) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE receipt_number=@receipt")
            .addNamedParameter("receipt", strParam(receiptNumber)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public void deleteByStudentId(Long studentId) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE student_id=@sid")
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
