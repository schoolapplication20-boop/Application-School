package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.TransportDriver;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class TransportDriverRepository extends BigQueryBaseRepository {

    private TransportDriver map(com.google.cloud.bigquery.FieldValueList row) {
        TransportDriver td = new TransportDriver();
        td.setId(longVal(row, "id"));
        td.setName(str(row, "name"));
        td.setLicense(str(row, "license"));
        td.setMobile(str(row, "mobile"));
        td.setBus(str(row, "bus"));
        td.setExperience(str(row, "experience"));
        td.setStatus(str(row, "status"));
        td.setCreatedAt(datetimeVal(row, "created_at"));
        td.setUpdatedAt(datetimeVal(row, "updated_at"));
        return td;
    }

    public TransportDriver save(TransportDriver td) {
        if (td.getId() == null) {
            td.setId(generateNextId("transport_drivers"));
            td.setCreatedAt(now());
            td.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("transport_drivers") +
                    " (id,name,license,mobile,bus,experience,status,created_at,updated_at)" +
                    " VALUES (@id,@name,@lic,@mobile,@bus,@exp,@status,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(td.getId()))
                    .addNamedParameter("name", strParam(td.getName()))
                    .addNamedParameter("lic", strParam(td.getLicense()))
                    .addNamedParameter("mobile", strParam(td.getMobile()))
                    .addNamedParameter("bus", strParam(td.getBus()))
                    .addNamedParameter("exp", strParam(td.getExperience()))
                    .addNamedParameter("status", strParam(td.getStatus()))
                    .addNamedParameter("ca", datetimeParam(td.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(td.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            td.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("transport_drivers") +
                    " SET name=@name,license=@lic,mobile=@mobile,bus=@bus,experience=@exp," +
                    "status=@status,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("name", strParam(td.getName()))
                    .addNamedParameter("lic", strParam(td.getLicense()))
                    .addNamedParameter("mobile", strParam(td.getMobile()))
                    .addNamedParameter("bus", strParam(td.getBus()))
                    .addNamedParameter("exp", strParam(td.getExperience()))
                    .addNamedParameter("status", strParam(td.getStatus()))
                    .addNamedParameter("ua", datetimeParam(td.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(td.getId()))
                    .build();
            executeQuery(q);
        }
        return td;
    }

    public Optional<TransportDriver> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("transport_drivers") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<TransportDriver> findAll() {
        String sql = "SELECT * FROM " + tableRef("transport_drivers");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<TransportDriver> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("transport_drivers") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("transport_drivers") + " WHERE id=@id";
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
