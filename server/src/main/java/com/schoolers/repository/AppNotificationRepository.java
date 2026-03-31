package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.AppNotification;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class AppNotificationRepository extends BigQueryBaseRepository {

    private AppNotification map(com.google.cloud.bigquery.FieldValueList row) {
        AppNotification n = new AppNotification();
        n.setId(longVal(row, "id"));
        n.setUserId(longVal(row, "user_id"));
        n.setMessage(str(row, "message"));
        n.setIcon(str(row, "icon"));
        n.setColor(str(row, "color"));
        n.setIsRead(boolVal(row, "is_read"));
        n.setLinkType(str(row, "link_type"));
        n.setLinkId(longVal(row, "link_id"));
        n.setCreatedAt(datetimeVal(row, "created_at"));
        return n;
    }

    public AppNotification save(AppNotification n) {
        if (n.getId() == null) {
            n.setId(generateNextId("notifications"));
            n.setCreatedAt(now());
            String sql = "INSERT INTO " + tableRef("notifications") +
                    " (id,user_id,message,icon,color,is_read,link_type,link_id,created_at)" +
                    " VALUES (@id,@uid,@msg,@icon,@color,@isread,@ltype,@lid,@ca)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(n.getId()))
                    .addNamedParameter("uid", int64Param(n.getUserId()))
                    .addNamedParameter("msg", strParam(n.getMessage()))
                    .addNamedParameter("icon", strParam(n.getIcon()))
                    .addNamedParameter("color", strParam(n.getColor()))
                    .addNamedParameter("isread", boolParam(n.getIsRead()))
                    .addNamedParameter("ltype", strParam(n.getLinkType()))
                    .addNamedParameter("lid", int64Param(n.getLinkId()))
                    .addNamedParameter("ca", datetimeParam(n.getCreatedAt()))
                    .build();
            executeQuery(q);
        } else {
            String sql = "UPDATE " + tableRef("notifications") +
                    " SET user_id=@uid,message=@msg,icon=@icon,color=@color,is_read=@isread," +
                    "link_type=@ltype,link_id=@lid WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("uid", int64Param(n.getUserId()))
                    .addNamedParameter("msg", strParam(n.getMessage()))
                    .addNamedParameter("icon", strParam(n.getIcon()))
                    .addNamedParameter("color", strParam(n.getColor()))
                    .addNamedParameter("isread", boolParam(n.getIsRead()))
                    .addNamedParameter("ltype", strParam(n.getLinkType()))
                    .addNamedParameter("lid", int64Param(n.getLinkId()))
                    .addNamedParameter("id", int64Param(n.getId()))
                    .build();
            executeQuery(q);
        }
        return n;
    }

    public Optional<AppNotification> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("notifications") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<AppNotification> findAll() {
        String sql = "SELECT * FROM " + tableRef("notifications");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<AppNotification> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("notifications") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<AppNotification> findByUserIdOrderByCreatedAtDesc(Long userId) {
        String sql = "SELECT * FROM " + tableRef("notifications") + " WHERE user_id=@uid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("uid", int64Param(userId))
                .build();
        TableResult result = executeQuery(q);
        List<AppNotification> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public long countByUserIdAndIsReadFalse(Long userId) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("notifications") +
                " WHERE user_id=@uid AND is_read=FALSE";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("uid", int64Param(userId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue();
        }
        return 0L;
    }

    public List<AppNotification> saveAll(List<AppNotification> notifications) {
        List<AppNotification> saved = new ArrayList<>();
        for (AppNotification n : notifications) { saved.add(save(n)); }
        return saved;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("notifications") + " WHERE id=@id";
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
