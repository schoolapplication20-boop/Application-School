package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportStop;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportStopRepository extends BigQueryBaseRepository {

    private TransportStop map(com.google.cloud.bigquery.FieldValueList row) {
        TransportStop ts = new TransportStop();
        ts.setId(longVal(row, "id"));
        ts.setRouteId(longVal(row, "route_id"));
        ts.setRouteName(str(row, "route_name"));
        ts.setName(str(row, "name"));
        ts.setTiming(str(row, "timing"));
        ts.setStopOrder(intVal(row, "stop_order"));
        ts.setCreatedAt(datetimeVal(row, "created_at"));
        return ts;
    }

    public TransportStop save(TransportStop ts) {
        if (ts.getId() == null) {
            ts.setId(generateNextId("transport_stops"));
            ts.setCreatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_stops") +
                    " (id,route_id,route_name,name,timing,stop_order,created_at)" +
                    " VALUES (@id,@rid,@rname,@name,@timing,@sorder,@ca)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(ts.getId()))
                    .addNamedParameter("rid", int64Param(ts.getRouteId()))
                    .addNamedParameter("rname", strParam(ts.getRouteName()))
                    .addNamedParameter("name", strParam(ts.getName()))
                    .addNamedParameter("timing", strParam(ts.getTiming()))
                    .addNamedParameter("sorder", int64Param(ts.getStopOrder()))
                    .addNamedParameter("ca", datetimeParam(ts.getCreatedAt()))
                    .build();
            executeQuery(q);
        } else {
            String sql = "UPDATE " + tableRef("transport_stops") +
                    " SET route_id=@rid,route_name=@rname,name=@name,timing=@timing,stop_order=@sorder" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("rid", int64Param(ts.getRouteId()))
                    .addNamedParameter("rname", strParam(ts.getRouteName()))
                    .addNamedParameter("name", strParam(ts.getName()))
                    .addNamedParameter("timing", strParam(ts.getTiming()))
                    .addNamedParameter("sorder", int64Param(ts.getStopOrder()))
                    .addNamedParameter("id", int64Param(ts.getId()))
                    .build();
            executeQuery(q);
        }
        return ts;
    }

    public Optional<TransportStop> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_stops") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportStop> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_stops");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportStop> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_stops") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<TransportStop> findByRouteIdOrderByStopOrder(Long routeId) {
        String sql = "SELECT * FROM " + tableRef("transport_stops") +
                " WHERE route_id=@rid ORDER BY stop_order ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(routeId))
                .build();
        TableResult result = executeQuery(q);
        List<TransportStop> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_stops") + " WHERE id=@id";
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
