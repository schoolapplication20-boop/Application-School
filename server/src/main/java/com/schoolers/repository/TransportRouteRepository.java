package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportRoute;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportRouteRepository extends BigQueryBaseRepository {

    private TransportRoute map(com.google.cloud.bigquery.FieldValueList row) {
        TransportRoute tr = new TransportRoute();
        tr.setId(longVal(row, "id"));
        tr.setName(str(row, "name"));
        tr.setArea(str(row, "area"));
        tr.setStops(intVal(row, "stops"));
        tr.setDistance(str(row, "distance"));
        tr.setPickupTime(str(row, "pickup_time"));
        tr.setDropTime(str(row, "drop_time"));
        tr.setBuses(intVal(row, "buses"));
        tr.setCreatedAt(datetimeVal(row, "created_at"));
        tr.setUpdatedAt(datetimeVal(row, "updated_at"));
        return tr;
    }

    public TransportRoute save(TransportRoute tr) {
        if (tr.getId() == null) {
            tr.setId(generateNextId("transport_routes"));
            tr.setCreatedAt(now());
            tr.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_routes") +
                    " (id,name,area,stops,distance,pickup_time,drop_time,buses,created_at,updated_at)" +
                    " VALUES (@id,@name,@area,@stops,@dist,@ptime,@dtime,@buses,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(tr.getId()))
                    .addNamedParameter("name", strParam(tr.getName()))
                    .addNamedParameter("area", strParam(tr.getArea()))
                    .addNamedParameter("stops", int64Param(tr.getStops()))
                    .addNamedParameter("dist", strParam(tr.getDistance()))
                    .addNamedParameter("ptime", strParam(tr.getPickupTime()))
                    .addNamedParameter("dtime", strParam(tr.getDropTime()))
                    .addNamedParameter("buses", int64Param(tr.getBuses()))
                    .addNamedParameter("ca", datetimeParam(tr.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(tr.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            tr.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("transport_routes") +
                    " SET name=@name,area=@area,stops=@stops,distance=@dist,pickup_time=@ptime," +
                    "drop_time=@dtime,buses=@buses,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("name", strParam(tr.getName()))
                    .addNamedParameter("area", strParam(tr.getArea()))
                    .addNamedParameter("stops", int64Param(tr.getStops()))
                    .addNamedParameter("dist", strParam(tr.getDistance()))
                    .addNamedParameter("ptime", strParam(tr.getPickupTime()))
                    .addNamedParameter("dtime", strParam(tr.getDropTime()))
                    .addNamedParameter("buses", int64Param(tr.getBuses()))
                    .addNamedParameter("ua", datetimeParam(tr.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(tr.getId()))
                    .build();
            executeQuery(q);
        }
        return tr;
    }

    public Optional<TransportRoute> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_routes") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportRoute> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_routes");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportRoute> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_routes") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_routes") + " WHERE id=@id";
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
