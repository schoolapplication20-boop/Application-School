package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportFee;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportFeeRepository extends BigQueryBaseRepository {

    private TransportFee map(com.google.cloud.bigquery.FieldValueList row) {
        TransportFee tf = new TransportFee();
        tf.setId(longVal(row, "id"));
        tf.setStudentId(longVal(row, "student_id"));
        tf.setStudentName(str(row, "student_name"));
        tf.setBusNo(str(row, "bus_no"));
        tf.setRoute(str(row, "route"));
        tf.setMonth(str(row, "month"));
        tf.setAmount(decimalVal(row, "amount"));
        String statusStr = str(row, "status");
        if (statusStr != null) tf.setStatus(TransportFee.Status.valueOf(statusStr));
        tf.setPaidDate(dateVal(row, "paid_date"));
        tf.setCreatedAt(datetimeVal(row, "created_at"));
        tf.setUpdatedAt(datetimeVal(row, "updated_at"));
        return tf;
    }

    public TransportFee save(TransportFee tf) {
        if (tf.getId() == null) {
            tf.setId(generateNextId("transport_fees"));
            tf.setCreatedAt(now());
            tf.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_fees") +
                    " (id,student_id,student_name,bus_no,route,month,amount,status,paid_date,created_at,updated_at)" +
                    " VALUES (@id,@sid,@sname,@bno,@route,@month,@amount,@status,@pdate,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(tf.getId()))
                    .addNamedParameter("sid", int64Param(tf.getStudentId()))
                    .addNamedParameter("sname", strParam(tf.getStudentName()))
                    .addNamedParameter("bno", strParam(tf.getBusNo()))
                    .addNamedParameter("route", strParam(tf.getRoute()))
                    .addNamedParameter("month", strParam(tf.getMonth()))
                    .addNamedParameter("amount", numericParam(tf.getAmount()))
                    .addNamedParameter("status", strParam(tf.getStatus() != null ? tf.getStatus().name() : null))
                    .addNamedParameter("pdate", dateParam(tf.getPaidDate()))
                    .addNamedParameter("ca", datetimeParam(tf.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(tf.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            tf.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("transport_fees") +
                    " SET student_id=@sid,student_name=@sname,bus_no=@bno,route=@route,month=@month," +
                    "amount=@amount,status=@status,paid_date=@pdate,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sid", int64Param(tf.getStudentId()))
                    .addNamedParameter("sname", strParam(tf.getStudentName()))
                    .addNamedParameter("bno", strParam(tf.getBusNo()))
                    .addNamedParameter("route", strParam(tf.getRoute()))
                    .addNamedParameter("month", strParam(tf.getMonth()))
                    .addNamedParameter("amount", numericParam(tf.getAmount()))
                    .addNamedParameter("status", strParam(tf.getStatus() != null ? tf.getStatus().name() : null))
                    .addNamedParameter("pdate", dateParam(tf.getPaidDate()))
                    .addNamedParameter("ua", datetimeParam(tf.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(tf.getId()))
                    .build();
            executeQuery(q);
        }
        return tf;
    }

    public Optional<TransportFee> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_fees") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportFee> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_fees");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportFee> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_fees") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<TransportFee> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM " + tableRef("transport_fees") + " WHERE student_id=@sid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        List<TransportFee> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<TransportFee> findByStatus(TransportFee.Status status) {
        String sql = "SELECT * FROM " + tableRef("transport_fees") + " WHERE status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<TransportFee> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_fees") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByStudentId(Long studentId) {
        String sql = "DELETE FROM " + tableRef("transport_fees") + " WHERE student_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
