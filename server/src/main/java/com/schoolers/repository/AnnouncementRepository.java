package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Announcement;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class AnnouncementRepository extends BigQueryBaseRepository {
    private static final String T = "announcements";
    private String tbl() { return tableRef(T); }

    private Announcement map(FieldValueList r) {
        Announcement a = new Announcement();
        a.setId(longVal(r, "id"));
        a.setTitle(str(r, "title"));
        a.setContent(str(r, "content"));
        a.setTargetRole(str(r, "target_role"));
        a.setCreatedBy(str(r, "created_by"));
        a.setCreatedById(longVal(r, "created_by_id"));
        a.setIsActive(boolVal(r, "is_active"));
        a.setCreatedAt(datetimeVal(r, "created_at"));
        a.setUpdatedAt(datetimeVal(r, "updated_at"));
        return a;
    }

    public Announcement save(Announcement a) {
        if (a.getId() == null) {
            a.setId(generateNextId(T));
            a.setCreatedAt(now());
            a.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,title,content,target_role,created_by,created_by_id,is_active,created_at,updated_at) VALUES (@id,@title,@content,@role,@createdby,@createdbyid,@active,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(a.getId()))
                .addNamedParameter("title", strParam(a.getTitle()))
                .addNamedParameter("content", strParam(a.getContent()))
                .addNamedParameter("role", strParam(a.getTargetRole()))
                .addNamedParameter("createdby", strParam(a.getCreatedBy()))
                .addNamedParameter("createdbyid", int64Param(a.getCreatedById()))
                .addNamedParameter("active", boolParam(a.getIsActive()))
                .addNamedParameter("ca", datetimeParam(a.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                .build());
        } else {
            a.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET title=@title,content=@content,target_role=@role,created_by=@createdby,created_by_id=@createdbyid,is_active=@active,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(a.getId()))
                .addNamedParameter("title", strParam(a.getTitle()))
                .addNamedParameter("content", strParam(a.getContent()))
                .addNamedParameter("role", strParam(a.getTargetRole()))
                .addNamedParameter("createdby", strParam(a.getCreatedBy()))
                .addNamedParameter("createdbyid", int64Param(a.getCreatedById()))
                .addNamedParameter("active", boolParam(a.getIsActive()))
                .addNamedParameter("ua", datetimeParam(a.getUpdatedAt()))
                .build());
        }
        return a;
    }

    public Optional<Announcement> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Announcement> findAll() {
        List<Announcement> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " ORDER BY created_at DESC").build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public boolean existsById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public List<Announcement> findByIsActiveTrueOrderByCreatedAtDesc() {
        List<Announcement> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE is_active=true ORDER BY created_at DESC").build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Announcement> findByTargetRoleInOrderByCreatedAtDesc(List<String> roles) {
        List<Announcement> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE target_role IN UNNEST(@roles) OR target_role='ALL' ORDER BY created_at DESC")
            .addNamedParameter("roles", QueryParameterValue.array(roles.toArray(new String[0]), String.class)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }
}
