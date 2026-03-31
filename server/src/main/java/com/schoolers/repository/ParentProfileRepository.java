package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.ParentProfile;
import com.schoolers.model.User;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class ParentProfileRepository extends BigQueryBaseRepository {
    private static final String T = "parent_profiles";
    private String tbl() { return tableRef(T); }

    private ParentProfile map(FieldValueList r) {
        ParentProfile p = new ParentProfile();
        p.setId(longVal(r, "id"));
        Long userId = longVal(r, "user_id");
        if (userId != null) {
            User u = new User();
            u.setId(userId);
            p.setUser(u);
        }
        p.setName(str(r, "name"));
        p.setRelation(str(r, "relation"));
        p.setOccupation(str(r, "occupation"));
        p.setAddress(str(r, "address"));
        p.setAlternateMobile(str(r, "alternate_mobile"));
        p.setIsActive(boolVal(r, "is_active"));
        p.setCreatedAt(datetimeVal(r, "created_at"));
        p.setUpdatedAt(datetimeVal(r, "updated_at"));
        return p;
    }

    public ParentProfile save(ParentProfile p) {
        Long userId = (p.getUser() != null) ? p.getUser().getId() : null;
        if (p.getId() == null) {
            p.setId(generateNextId(T));
            p.setCreatedAt(now());
            p.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,user_id,name,relation,occupation,address,alternate_mobile,is_active,created_at,updated_at) VALUES (@id,@uid,@name,@rel,@occ,@addr,@altmob,@active,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(p.getId()))
                .addNamedParameter("uid", int64Param(userId))
                .addNamedParameter("name", strParam(p.getName()))
                .addNamedParameter("rel", strParam(p.getRelation()))
                .addNamedParameter("occ", strParam(p.getOccupation()))
                .addNamedParameter("addr", strParam(p.getAddress()))
                .addNamedParameter("altmob", strParam(p.getAlternateMobile()))
                .addNamedParameter("active", boolParam(p.getIsActive()))
                .addNamedParameter("ca", datetimeParam(p.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(p.getUpdatedAt()))
                .build());
        } else {
            p.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET user_id=@uid,name=@name,relation=@rel,occupation=@occ,address=@addr,alternate_mobile=@altmob,is_active=@active,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(p.getId()))
                .addNamedParameter("uid", int64Param(userId))
                .addNamedParameter("name", strParam(p.getName()))
                .addNamedParameter("rel", strParam(p.getRelation()))
                .addNamedParameter("occ", strParam(p.getOccupation()))
                .addNamedParameter("addr", strParam(p.getAddress()))
                .addNamedParameter("altmob", strParam(p.getAlternateMobile()))
                .addNamedParameter("active", boolParam(p.getIsActive()))
                .addNamedParameter("ua", datetimeParam(p.getUpdatedAt()))
                .build());
        }
        return p;
    }

    public Optional<ParentProfile> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<ParentProfile> findAll() {
        List<ParentProfile> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public Optional<ParentProfile> findByUser(User user) {
        if (user == null || user.getId() == null) return Optional.empty();
        return findByUserId(user.getId());
    }

    public Optional<ParentProfile> findByUserId(Long userId) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE user_id=@uid")
            .addNamedParameter("uid", int64Param(userId)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }
}
