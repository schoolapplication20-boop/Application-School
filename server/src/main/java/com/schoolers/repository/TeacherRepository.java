package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Teacher;
import com.schoolers.model.User;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class TeacherRepository extends BigQueryBaseRepository {
    private static final String T = "teachers";
    private String tbl() { return tableRef(T); }
    private String userTbl() { return tableRef("users"); }

    private static final String JOIN_SQL =
        "SELECT t.*, u.id as u_id, u.name as u_name, u.email as u_email, u.mobile as u_mobile, " +
        "u.password as u_pass, u.role as u_role, u.is_active as u_active, u.first_login as u_fl, " +
        "u.permissions as u_perm, u.temp_password as u_tp, u.reset_otp as u_otp, " +
        "u.otp_expiry as u_otpexp, u.created_at as u_ca, u.updated_at as u_ua " +
        "FROM %s t LEFT JOIN %s u ON t.user_id = u.id";

    private String joinSql() {
        return String.format(JOIN_SQL, tbl(), userTbl());
    }

    private Teacher map(FieldValueList r) {
        Teacher t = new Teacher();
        t.setId(longVal(r, "id"));
        t.setName(str(r, "name"));
        t.setEmployeeId(str(r, "employee_id"));
        t.setSubject(str(r, "subject"));
        t.setDepartment(str(r, "department"));
        t.setClasses(str(r, "classes"));
        t.setQualification(str(r, "qualification"));
        t.setExperience(str(r, "experience"));
        t.setJoiningDate(dateVal(r, "joining_date"));
        t.setTeacherType(str(r, "teacher_type"));
        t.setPrimaryClassId(longVal(r, "primary_class_id"));
        t.setIsActive(boolVal(r, "is_active"));
        t.setCreatedAt(datetimeVal(r, "created_at"));
        t.setUpdatedAt(datetimeVal(r, "updated_at"));
        // Map user
        Long userId = longVal(r, "u_id");
        if (userId != null) {
            User u = new User();
            u.setId(userId);
            u.setName(str(r, "u_name"));
            u.setEmail(str(r, "u_email"));
            u.setMobile(str(r, "u_mobile"));
            u.setPassword(str(r, "u_pass"));
            String roleStr = str(r, "u_role");
            u.setRole(roleStr != null ? User.Role.valueOf(roleStr) : null);
            u.setIsActive(boolVal(r, "u_active"));
            u.setFirstLogin(boolVal(r, "u_fl"));
            u.setPermissions(str(r, "u_perm"));
            u.setTempPassword(str(r, "u_tp"));
            u.setResetOtp(str(r, "u_otp"));
            u.setOtpExpiry(timestampVal(r, "u_otpexp"));
            u.setCreatedAt(timestampVal(r, "u_ca"));
            u.setUpdatedAt(timestampVal(r, "u_ua"));
            t.setUser(u);
        }
        return t;
    }

    public Teacher save(Teacher t) {
        Long userId = (t.getUser() != null) ? t.getUser().getId() : null;
        if (t.getId() == null) {
            t.setId(generateNextId(T));
            t.setCreatedAt(now());
            t.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,user_id,name,employee_id,subject,department,classes,qualification,experience,joining_date,teacher_type,primary_class_id,is_active,created_at,updated_at) VALUES (@id,@uid,@name,@eid,@subj,@dept,@cls,@qual,@exp,@jd,@ttype,@pcid,@active,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(t.getId()))
                .addNamedParameter("uid", int64Param(userId))
                .addNamedParameter("name", strParam(t.getName()))
                .addNamedParameter("eid", strParam(t.getEmployeeId()))
                .addNamedParameter("subj", strParam(t.getSubject()))
                .addNamedParameter("dept", strParam(t.getDepartment()))
                .addNamedParameter("cls", strParam(t.getClasses()))
                .addNamedParameter("qual", strParam(t.getQualification()))
                .addNamedParameter("exp", strParam(t.getExperience()))
                .addNamedParameter("jd", dateParam(t.getJoiningDate()))
                .addNamedParameter("ttype", strParam(t.getTeacherType()))
                .addNamedParameter("pcid", int64Param(t.getPrimaryClassId()))
                .addNamedParameter("active", boolParam(t.getIsActive()))
                .addNamedParameter("ca", datetimeParam(t.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(t.getUpdatedAt()))
                .build());
        } else {
            t.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET user_id=@uid,name=@name,employee_id=@eid,subject=@subj,department=@dept,classes=@cls,qualification=@qual,experience=@exp,joining_date=@jd,teacher_type=@ttype,primary_class_id=@pcid,is_active=@active,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(t.getId()))
                .addNamedParameter("uid", int64Param(userId))
                .addNamedParameter("name", strParam(t.getName()))
                .addNamedParameter("eid", strParam(t.getEmployeeId()))
                .addNamedParameter("subj", strParam(t.getSubject()))
                .addNamedParameter("dept", strParam(t.getDepartment()))
                .addNamedParameter("cls", strParam(t.getClasses()))
                .addNamedParameter("qual", strParam(t.getQualification()))
                .addNamedParameter("exp", strParam(t.getExperience()))
                .addNamedParameter("jd", dateParam(t.getJoiningDate()))
                .addNamedParameter("ttype", strParam(t.getTeacherType()))
                .addNamedParameter("pcid", int64Param(t.getPrimaryClassId()))
                .addNamedParameter("active", boolParam(t.getIsActive()))
                .addNamedParameter("ua", datetimeParam(t.getUpdatedAt()))
                .build());
        }
        return t;
    }

    public Optional<Teacher> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder(joinSql() + " WHERE t.id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Teacher> findAll() {
        List<Teacher> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder(joinSql()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public Optional<Teacher> findByEmployeeId(String employeeId) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder(joinSql() + " WHERE t.employee_id=@eid")
            .addNamedParameter("eid", strParam(employeeId)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public Optional<Teacher> findByUserId(Long userId) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder(joinSql() + " WHERE t.user_id=@uid")
            .addNamedParameter("uid", int64Param(userId)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Teacher> findBySubject(String subject) {
        List<Teacher> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder(joinSql() + " WHERE t.subject=@subj")
            .addNamedParameter("subj", strParam(subject)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public long countByIsActive(Boolean isActive) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE is_active=@active")
            .addNamedParameter("active", boolParam(isActive)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }
}
