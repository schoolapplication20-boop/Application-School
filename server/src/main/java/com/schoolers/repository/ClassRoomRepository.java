package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.ClassRoom;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class ClassRoomRepository extends BigQueryBaseRepository {
    private static final String T = "classrooms";
    private String tbl() { return tableRef(T); }

    private ClassRoom map(FieldValueList r) {
        ClassRoom c = new ClassRoom();
        c.setId(longVal(r, "id"));
        c.setName(str(r, "class_name"));
        c.setSection(str(r, "section"));
        c.setTeacherId(longVal(r, "teacher_id"));
        c.setTeacherName(str(r, "teacher_name"));
        c.setCapacity(intVal(r, "capacity"));
        c.setIsActive(boolVal(r, "is_active"));
        c.setCreatedAt(datetimeVal(r, "created_at"));
        c.setUpdatedAt(datetimeVal(r, "updated_at"));
        return c;
    }

    public ClassRoom save(ClassRoom c) {
        if (c.getId() == null) {
            c.setId(generateNextId(T));
            c.setCreatedAt(now());
            c.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,class_name,section,teacher_id,teacher_name,capacity,is_active,created_at,updated_at) VALUES (@id,@cls,@sec,@tid,@tname,@cap,@active,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(c.getId()))
                .addNamedParameter("cls", strParam(c.getName()))
                .addNamedParameter("sec", strParam(c.getSection()))
                .addNamedParameter("tid", int64Param(c.getTeacherId()))
                .addNamedParameter("tname", strParam(c.getTeacherName()))
                .addNamedParameter("cap", int64Param(c.getCapacity()))
                .addNamedParameter("active", boolParam(c.getIsActive()))
                .addNamedParameter("ca", datetimeParam(c.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(c.getUpdatedAt()))
                .build());
        } else {
            c.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET class_name=@cls,section=@sec,teacher_id=@tid,teacher_name=@tname,capacity=@cap,is_active=@active,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(c.getId()))
                .addNamedParameter("cls", strParam(c.getName()))
                .addNamedParameter("sec", strParam(c.getSection()))
                .addNamedParameter("tid", int64Param(c.getTeacherId()))
                .addNamedParameter("tname", strParam(c.getTeacherName()))
                .addNamedParameter("cap", int64Param(c.getCapacity()))
                .addNamedParameter("active", boolParam(c.getIsActive()))
                .addNamedParameter("ua", datetimeParam(c.getUpdatedAt()))
                .build());
        }
        return c;
    }

    public Optional<ClassRoom> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<ClassRoom> findAll() {
        List<ClassRoom> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public List<ClassRoom> findByTeacherId(Long teacherId) {
        List<ClassRoom> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE teacher_id=@tid")
            .addNamedParameter("tid", int64Param(teacherId)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public Optional<ClassRoom> findByNameAndSection(String name, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE class_name=@cls AND section=@sec")
            .addNamedParameter("cls", strParam(name))
            .addNamedParameter("sec", strParam(section)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public Optional<ClassRoom> findByNameIgnoreCaseAndSectionIgnoreCase(String name, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE LOWER(class_name)=LOWER(@cls) AND LOWER(section)=LOWER(@sec)")
            .addNamedParameter("cls", strParam(name))
            .addNamedParameter("sec", strParam(section)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public boolean existsByNameIgnoreCaseAndSectionIgnoreCase(String name, String section) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE LOWER(class_name)=LOWER(@cls) AND LOWER(section)=LOWER(@sec)")
            .addNamedParameter("cls", strParam(name))
            .addNamedParameter("sec", strParam(section)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public List<ClassRoom> findByIsActive(Boolean isActive) {
        List<ClassRoom> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE is_active=@active")
            .addNamedParameter("active", boolParam(isActive)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }
}
