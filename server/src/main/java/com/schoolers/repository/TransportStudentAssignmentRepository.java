package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportStudentAssignment;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportStudentAssignmentRepository extends BigQueryBaseRepository {

    private TransportStudentAssignment map(com.google.cloud.bigquery.FieldValueList row) {
        TransportStudentAssignment tsa = new TransportStudentAssignment();
        tsa.setId(longVal(row, "id"));
        tsa.setStudentId(longVal(row, "student_id"));
        tsa.setStudentName(str(row, "student_name"));
        tsa.setBusId(longVal(row, "bus_id"));
        tsa.setBusNo(str(row, "bus_no"));
        tsa.setRouteId(longVal(row, "route_id"));
        tsa.setRouteName(str(row, "route_name"));
        tsa.setStopId(longVal(row, "stop_id"));
        tsa.setStopName(str(row, "stop_name"));
        tsa.setFeePaid(boolVal(row, "fee_paid"));
        tsa.setCreatedAt(datetimeVal(row, "created_at"));
        tsa.setUpdatedAt(datetimeVal(row, "updated_at"));
        return tsa;
    }

    public TransportStudentAssignment save(TransportStudentAssignment tsa) {
        if (tsa.getId() == null) {
            tsa.setId(generateNextId("transport_student_assignments"));
            tsa.setCreatedAt(now());
            tsa.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_student_assignments") +
                    " (id,student_id,student_name,bus_id,bus_no,route_id,route_name,stop_id,stop_name,fee_paid,created_at,updated_at)" +
                    " VALUES (@id,@sid,@sname,@bid,@bno,@rid,@rname,@stid,@stname,@feepaid,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(tsa.getId()))
                    .addNamedParameter("sid", int64Param(tsa.getStudentId()))
                    .addNamedParameter("sname", strParam(tsa.getStudentName()))
                    .addNamedParameter("bid", int64Param(tsa.getBusId()))
                    .addNamedParameter("bno", strParam(tsa.getBusNo()))
                    .addNamedParameter("rid", int64Param(tsa.getRouteId()))
                    .addNamedParameter("rname", strParam(tsa.getRouteName()))
                    .addNamedParameter("stid", int64Param(tsa.getStopId()))
                    .addNamedParameter("stname", strParam(tsa.getStopName()))
                    .addNamedParameter("feepaid", boolParam(tsa.getFeePaid()))
                    .addNamedParameter("ca", datetimeParam(tsa.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(tsa.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            tsa.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("transport_student_assignments") +
                    " SET student_id=@sid,student_name=@sname,bus_id=@bid,bus_no=@bno,route_id=@rid," +
                    "route_name=@rname,stop_id=@stid,stop_name=@stname,fee_paid=@feepaid,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sid", int64Param(tsa.getStudentId()))
                    .addNamedParameter("sname", strParam(tsa.getStudentName()))
                    .addNamedParameter("bid", int64Param(tsa.getBusId()))
                    .addNamedParameter("bno", strParam(tsa.getBusNo()))
                    .addNamedParameter("rid", int64Param(tsa.getRouteId()))
                    .addNamedParameter("rname", strParam(tsa.getRouteName()))
                    .addNamedParameter("stid", int64Param(tsa.getStopId()))
                    .addNamedParameter("stname", strParam(tsa.getStopName()))
                    .addNamedParameter("feepaid", boolParam(tsa.getFeePaid()))
                    .addNamedParameter("ua", datetimeParam(tsa.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(tsa.getId()))
                    .build();
            executeQuery(q);
        }
        return tsa;
    }

    public Optional<TransportStudentAssignment> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_student_assignments") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportStudentAssignment> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_student_assignments");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportStudentAssignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_student_assignments") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public Optional<TransportStudentAssignment> findByStudentId(Long studentId) {
        String sql = "SELECT * FROM " + tableRef("transport_student_assignments") +
                " WHERE student_id=@sid LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportStudentAssignment> findByBusId(Long busId) {
        String sql = "SELECT * FROM " + tableRef("transport_student_assignments") + " WHERE bus_id=@bid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("bid", int64Param(busId))
                .build();
        TableResult result = executeQuery(q);
        List<TransportStudentAssignment> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_student_assignments") + " WHERE id=@id";
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
        String sql = "DELETE FROM " + tableRef("transport_student_assignments") + " WHERE student_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
