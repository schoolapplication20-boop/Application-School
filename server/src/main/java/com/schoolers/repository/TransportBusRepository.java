package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportBus;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportBusRepository extends BigQueryBaseRepository {

    private TransportBus map(com.google.cloud.bigquery.FieldValueList row) {
        TransportBus tb = new TransportBus();
        tb.setId(longVal(row, "id"));
        tb.setBusNo(str(row, "bus_no"));
        tb.setCapacity(intVal(row, "capacity"));
        tb.setCurrentStudents(intVal(row, "current_students"));
        tb.setDriver(str(row, "driver"));
        tb.setConductor(str(row, "conductor"));
        tb.setRoute(str(row, "route"));
        tb.setStatus(str(row, "status"));
        tb.setCreatedAt(datetimeVal(row, "created_at"));
        tb.setUpdatedAt(datetimeVal(row, "updated_at"));
        return tb;
    }

    public TransportBus save(TransportBus tb) {
        if (tb.getId() == null) {
            tb.setId(generateNextId("transport_buses"));
            tb.setCreatedAt(now());
            tb.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_buses") +
                    " (id,bus_no,capacity,current_students,driver,conductor,route,status,created_at,updated_at)" +
                    " VALUES (@id,@bno,@cap,@cur,@driver,@cond,@route,@status,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(tb.getId()))
                    .addNamedParameter("bno", strParam(tb.getBusNo()))
                    .addNamedParameter("cap", int64Param(tb.getCapacity()))
                    .addNamedParameter("cur", int64Param(tb.getCurrentStudents()))
                    .addNamedParameter("driver", strParam(tb.getDriver()))
                    .addNamedParameter("cond", strParam(tb.getConductor()))
                    .addNamedParameter("route", strParam(tb.getRoute()))
                    .addNamedParameter("status", strParam(tb.getStatus()))
                    .addNamedParameter("ca", datetimeParam(tb.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(tb.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            tb.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("transport_buses") +
                    " SET bus_no=@bno,capacity=@cap,current_students=@cur,driver=@driver,conductor=@cond," +
                    "route=@route,status=@status,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("bno", strParam(tb.getBusNo()))
                    .addNamedParameter("cap", int64Param(tb.getCapacity()))
                    .addNamedParameter("cur", int64Param(tb.getCurrentStudents()))
                    .addNamedParameter("driver", strParam(tb.getDriver()))
                    .addNamedParameter("cond", strParam(tb.getConductor()))
                    .addNamedParameter("route", strParam(tb.getRoute()))
                    .addNamedParameter("status", strParam(tb.getStatus()))
                    .addNamedParameter("ua", datetimeParam(tb.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(tb.getId()))
                    .build();
            executeQuery(q);
        }
        return tb;
    }

    public Optional<TransportBus> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_buses") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportBus> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_buses");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportBus> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_buses") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public Optional<TransportBus> findByBusNo(String busNo) {
        String sql = "SELECT * FROM " + tableRef("transport_buses") + " WHERE bus_no=@bno LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("bno", strParam(busNo))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public boolean existsByBusNo(String busNo) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_buses") + " WHERE bus_no=@bno";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("bno", strParam(busNo))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_buses") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }
}
