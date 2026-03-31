package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.User;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class UserRepository extends BigQueryBaseRepository {
    private static final String T = "users";
    private String tbl() { return tableRef(T); }

    private User map(FieldValueList r) {
        String roleStr = str(r, "role");
        User u = new User();
        u.setId(longVal(r, "id"));
        u.setName(str(r, "name"));
        u.setEmail(str(r, "email"));
        u.setMobile(str(r, "mobile"));
        u.setPassword(str(r, "password"));
        u.setTempPassword(str(r, "temp_password"));
        u.setRole(roleStr != null ? User.Role.valueOf(roleStr) : null);
        u.setIsActive(boolVal(r, "is_active"));
        u.setFirstLogin(boolVal(r, "first_login"));
        u.setPermissions(str(r, "permissions"));
        u.setResetOtp(str(r, "reset_otp"));
        u.setOtpExpiry(timestampVal(r, "otp_expiry"));
        u.setCreatedAt(timestampVal(r, "created_at"));
        u.setUpdatedAt(timestampVal(r, "updated_at"));
        return u;
    }

    public User save(User u) {
        if (u.getId() == null) {
            u.setId(generateNextId(T));
            u.setCreatedAt(now());
            u.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,name,email,mobile,password,temp_password,role,is_active,first_login,permissions,reset_otp,otp_expiry,created_at,updated_at) VALUES (@id,@name,@email,@mobile,@password,@tp,@role,@active,@fl,@perm,@otp,@otpexp,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(u.getId()))
                .addNamedParameter("name", strParam(u.getName()))
                .addNamedParameter("email", strParam(u.getEmail()))
                .addNamedParameter("mobile", strParam(u.getMobile()))
                .addNamedParameter("password", strParam(u.getPassword()))
                .addNamedParameter("tp", strParam(u.getTempPassword()))
                .addNamedParameter("role", strParam(u.getRole() != null ? u.getRole().name() : null))
                .addNamedParameter("active", boolParam(u.getIsActive()))
                .addNamedParameter("fl", boolParam(u.getFirstLogin()))
                .addNamedParameter("perm", strParam(u.getPermissions()))
                .addNamedParameter("otp", strParam(u.getResetOtp()))
                .addNamedParameter("otpexp", timestampParam(u.getOtpExpiry()))
                .addNamedParameter("ca", timestampParam(u.getCreatedAt()))
                .addNamedParameter("ua", timestampParam(u.getUpdatedAt()))
                .build());
        } else {
            u.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET name=@name,email=@email,mobile=@mobile,password=@password,temp_password=@tp,role=@role,is_active=@active,first_login=@fl,permissions=@perm,reset_otp=@otp,otp_expiry=@otpexp,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(u.getId()))
                .addNamedParameter("name", strParam(u.getName()))
                .addNamedParameter("email", strParam(u.getEmail()))
                .addNamedParameter("mobile", strParam(u.getMobile()))
                .addNamedParameter("password", strParam(u.getPassword()))
                .addNamedParameter("tp", strParam(u.getTempPassword()))
                .addNamedParameter("role", strParam(u.getRole() != null ? u.getRole().name() : null))
                .addNamedParameter("active", boolParam(u.getIsActive()))
                .addNamedParameter("fl", boolParam(u.getFirstLogin()))
                .addNamedParameter("perm", strParam(u.getPermissions()))
                .addNamedParameter("otp", strParam(u.getResetOtp()))
                .addNamedParameter("otpexp", timestampParam(u.getOtpExpiry()))
                .addNamedParameter("ua", timestampParam(u.getUpdatedAt()))
                .build());
        }
        return u;
    }

    public Optional<User> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<User> findAll() {
        List<User> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl()).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public void deleteById(Long id) {
        executeQuery(QueryJobConfiguration.newBuilder("DELETE FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
    }

    public Optional<User> findByEmail(String email) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE email=@email")
            .addNamedParameter("email", strParam(email)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public Optional<User> findByEmailIgnoreCase(String email) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE LOWER(email)=LOWER(@email)")
            .addNamedParameter("email", strParam(email)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public Optional<User> findByMobile(String mobile) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE mobile=@mobile")
            .addNamedParameter("mobile", strParam(mobile)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public boolean existsByEmail(String email) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE email=@email")
            .addNamedParameter("email", strParam(email)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public boolean existsByEmailIgnoreCase(String email) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE LOWER(email)=LOWER(@email)")
            .addNamedParameter("email", strParam(email)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public boolean existsByMobile(String mobile) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE mobile=@mobile")
            .addNamedParameter("mobile", strParam(mobile)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public boolean existsByMobileAndIdNot(String mobile, Long excludeId) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE mobile=@mobile AND id!=@id")
            .addNamedParameter("mobile", strParam(mobile))
            .addNamedParameter("id", int64Param(excludeId)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public boolean existsByEmailIgnoreCaseAndIdNot(String email, Long excludeId) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl() + " WHERE LOWER(email)=LOWER(@email) AND id!=@id")
            .addNamedParameter("email", strParam(email))
            .addNamedParameter("id", int64Param(excludeId)).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue() > 0;
    }

    public List<User> findByRole(User.Role role) {
        List<User> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE role=@role")
            .addNamedParameter("role", strParam(role.name())).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }
}
