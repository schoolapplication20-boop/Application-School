package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Salary;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class SalaryRepository extends BigQueryBaseRepository {

    private Salary map(com.google.cloud.bigquery.FieldValueList row) {
        Salary s = new Salary();
        s.setId(longVal(row, "id"));
        s.setStaffId(longVal(row, "staff_id"));
        s.setStaffName(str(row, "staff_name"));
        s.setRole(str(row, "role"));
        s.setDepartment(str(row, "department"));
        s.setBasic(decimalVal(row, "basic"));
        s.setHra(decimalVal(row, "hra"));
        s.setDa(decimalVal(row, "da"));
        s.setMedical(decimalVal(row, "medical"));
        s.setPf(decimalVal(row, "pf"));
        s.setTax(decimalVal(row, "tax"));
        s.setMonth(str(row, "month"));
        s.setYear(str(row, "year"));
        String statusStr = str(row, "status");
        if (statusStr != null) s.setStatus(Salary.Status.valueOf(statusStr));
        s.setPaymentMethod(str(row, "payment_method"));
        s.setPaidDate(dateVal(row, "paid_date"));
        s.setCreatedAt(datetimeVal(row, "created_at"));
        s.setUpdatedAt(datetimeVal(row, "updated_at"));
        return s;
    }

    public Salary save(Salary s) {
        if (s.getId() == null) {
            s.setId(generateNextId("salaries"));
            s.setCreatedAt(now());
            s.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("salaries") +
                    " (id,staff_id,staff_name,role,department,basic,hra,da,medical,pf,tax,month,year,status,payment_method,paid_date,created_at,updated_at)" +
                    " VALUES (@id,@sid,@sname,@role,@dept,@basic,@hra,@da,@medical,@pf,@tax,@month,@year,@status,@pmeth,@pdate,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(s.getId()))
                    .addNamedParameter("sid", int64Param(s.getStaffId()))
                    .addNamedParameter("sname", strParam(s.getStaffName()))
                    .addNamedParameter("role", strParam(s.getRole()))
                    .addNamedParameter("dept", strParam(s.getDepartment()))
                    .addNamedParameter("basic", numericParam(s.getBasic()))
                    .addNamedParameter("hra", numericParam(s.getHra()))
                    .addNamedParameter("da", numericParam(s.getDa()))
                    .addNamedParameter("medical", numericParam(s.getMedical()))
                    .addNamedParameter("pf", numericParam(s.getPf()))
                    .addNamedParameter("tax", numericParam(s.getTax()))
                    .addNamedParameter("month", strParam(s.getMonth()))
                    .addNamedParameter("year", strParam(s.getYear()))
                    .addNamedParameter("status", strParam(s.getStatus() != null ? s.getStatus().name() : null))
                    .addNamedParameter("pmeth", strParam(s.getPaymentMethod()))
                    .addNamedParameter("pdate", dateParam(s.getPaidDate()))
                    .addNamedParameter("ca", datetimeParam(s.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(s.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            s.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("salaries") +
                    " SET staff_id=@sid,staff_name=@sname,role=@role,department=@dept,basic=@basic,hra=@hra," +
                    "da=@da,medical=@medical,pf=@pf,tax=@tax,month=@month,year=@year,status=@status," +
                    "payment_method=@pmeth,paid_date=@pdate,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sid", int64Param(s.getStaffId()))
                    .addNamedParameter("sname", strParam(s.getStaffName()))
                    .addNamedParameter("role", strParam(s.getRole()))
                    .addNamedParameter("dept", strParam(s.getDepartment()))
                    .addNamedParameter("basic", numericParam(s.getBasic()))
                    .addNamedParameter("hra", numericParam(s.getHra()))
                    .addNamedParameter("da", numericParam(s.getDa()))
                    .addNamedParameter("medical", numericParam(s.getMedical()))
                    .addNamedParameter("pf", numericParam(s.getPf()))
                    .addNamedParameter("tax", numericParam(s.getTax()))
                    .addNamedParameter("month", strParam(s.getMonth()))
                    .addNamedParameter("year", strParam(s.getYear()))
                    .addNamedParameter("status", strParam(s.getStatus() != null ? s.getStatus().name() : null))
                    .addNamedParameter("pmeth", strParam(s.getPaymentMethod()))
                    .addNamedParameter("pdate", dateParam(s.getPaidDate()))
                    .addNamedParameter("ua", datetimeParam(s.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(s.getId()))
                    .build();
            executeQuery(q);
        }
        return s;
    }

    public Optional<Salary> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("salaries") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Salary> findAll() {
        String sql = "SELECT * FROM " + tableRef("salaries");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Salary> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("salaries") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Salary> findByStaffId(Long staffId) {
        String sql = "SELECT * FROM " + tableRef("salaries") + " WHERE staff_id=@sid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(staffId))
                .build();
        TableResult result = executeQuery(q);
        List<Salary> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Salary> findByMonthAndYear(String month, String year) {
        String sql = "SELECT * FROM " + tableRef("salaries") + " WHERE month=@month AND year=@year";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("month", strParam(month))
                .addNamedParameter("year", strParam(year))
                .build();
        TableResult result = executeQuery(q);
        List<Salary> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Salary> findByStatus(Salary.Status status) {
        String sql = "SELECT * FROM " + tableRef("salaries") + " WHERE status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<Salary> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("salaries") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByStaffId(Long staffId) {
        String sql = "DELETE FROM " + tableRef("salaries") + " WHERE staff_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(staffId)).build());
    }
}
