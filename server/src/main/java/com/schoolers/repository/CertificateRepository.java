package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Certificate;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class CertificateRepository extends BigQueryBaseRepository {

    private Certificate map(com.google.cloud.bigquery.FieldValueList row) {
        Certificate c = new Certificate();
        c.setId(longVal(row, "id"));
        c.setCertificateId(str(row, "certificate_id"));
        c.setCertificateType(str(row, "certificate_type"));
        c.setStudentId(longVal(row, "student_id"));
        c.setStudentName(str(row, "student_name"));
        c.setRollNumber(str(row, "roll_number"));
        c.setClassName(str(row, "class_name"));
        c.setSection(str(row, "section"));
        c.setIssueDate(dateVal(row, "issue_date"));
        c.setAcademicYear(str(row, "academic_year"));
        c.setExtraData(str(row, "extra_data"));
        c.setSchoolLogoUrl(str(row, "school_logo_url"));
        c.setPrincipalSignatureUrl(str(row, "principal_signature_url"));
        c.setPurpose(str(row, "purpose"));
        c.setIsActive(boolVal(row, "is_active"));
        c.setGeneratedBy(str(row, "generated_by"));
        c.setVerifiedBy(str(row, "verified_by"));
        c.setVerifiedAt(datetimeVal(row, "verified_at"));
        c.setCreatedAt(datetimeVal(row, "created_at"));
        c.setUpdatedAt(datetimeVal(row, "updated_at"));
        return c;
    }

    public Certificate save(Certificate c) {
        if (c.getId() == null) {
            c.setId(generateNextId("certificates"));
            c.setCreatedAt(now());
            c.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("certificates") +
                    " (id,certificate_id,certificate_type,student_id,student_name,roll_number,class_name,section," +
                    "issue_date,academic_year,extra_data,school_logo_url,principal_signature_url,purpose," +
                    "is_active,generated_by,verified_by,verified_at,created_at,updated_at)" +
                    " VALUES (@id,@certid,@ctype,@sid,@sname,@roll,@cname,@section,@idate,@ayear,@extra," +
                    "@logo,@sig,@purpose,@active,@genby,@verby,@verat,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(c.getId()))
                    .addNamedParameter("certid", strParam(c.getCertificateId()))
                    .addNamedParameter("ctype", strParam(c.getCertificateType()))
                    .addNamedParameter("sid", int64Param(c.getStudentId()))
                    .addNamedParameter("sname", strParam(c.getStudentName()))
                    .addNamedParameter("roll", strParam(c.getRollNumber()))
                    .addNamedParameter("cname", strParam(c.getClassName()))
                    .addNamedParameter("section", strParam(c.getSection()))
                    .addNamedParameter("idate", dateParam(c.getIssueDate()))
                    .addNamedParameter("ayear", strParam(c.getAcademicYear()))
                    .addNamedParameter("extra", strParam(c.getExtraData()))
                    .addNamedParameter("logo", strParam(c.getSchoolLogoUrl()))
                    .addNamedParameter("sig", strParam(c.getPrincipalSignatureUrl()))
                    .addNamedParameter("purpose", strParam(c.getPurpose()))
                    .addNamedParameter("active", boolParam(c.getIsActive()))
                    .addNamedParameter("genby", strParam(c.getGeneratedBy()))
                    .addNamedParameter("verby", strParam(c.getVerifiedBy()))
                    .addNamedParameter("verat", datetimeParam(c.getVerifiedAt()))
                    .addNamedParameter("ca", datetimeParam(c.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(c.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            c.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("certificates") +
                    " SET certificate_id=@certid,certificate_type=@ctype,student_id=@sid,student_name=@sname," +
                    "roll_number=@roll,class_name=@cname,section=@section,issue_date=@idate,academic_year=@ayear," +
                    "extra_data=@extra,school_logo_url=@logo,principal_signature_url=@sig,purpose=@purpose," +
                    "is_active=@active,generated_by=@genby,verified_by=@verby,verified_at=@verat,updated_at=@ua" +
                    " WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("certid", strParam(c.getCertificateId()))
                    .addNamedParameter("ctype", strParam(c.getCertificateType()))
                    .addNamedParameter("sid", int64Param(c.getStudentId()))
                    .addNamedParameter("sname", strParam(c.getStudentName()))
                    .addNamedParameter("roll", strParam(c.getRollNumber()))
                    .addNamedParameter("cname", strParam(c.getClassName()))
                    .addNamedParameter("section", strParam(c.getSection()))
                    .addNamedParameter("idate", dateParam(c.getIssueDate()))
                    .addNamedParameter("ayear", strParam(c.getAcademicYear()))
                    .addNamedParameter("extra", strParam(c.getExtraData()))
                    .addNamedParameter("logo", strParam(c.getSchoolLogoUrl()))
                    .addNamedParameter("sig", strParam(c.getPrincipalSignatureUrl()))
                    .addNamedParameter("purpose", strParam(c.getPurpose()))
                    .addNamedParameter("active", boolParam(c.getIsActive()))
                    .addNamedParameter("genby", strParam(c.getGeneratedBy()))
                    .addNamedParameter("verby", strParam(c.getVerifiedBy()))
                    .addNamedParameter("verat", datetimeParam(c.getVerifiedAt()))
                    .addNamedParameter("ua", datetimeParam(c.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(c.getId()))
                    .build();
            executeQuery(q);
        }
        return c;
    }

    public Optional<Certificate> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("certificates") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Certificate> findAll() {
        String sql = "SELECT * FROM " + tableRef("certificates");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Certificate> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("certificates") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public Optional<Certificate> findByCertificateId(String certificateId) {
        String sql = "SELECT * FROM " + tableRef("certificates") + " WHERE certificate_id=@certid LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("certid", strParam(certificateId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Certificate> findByStudentIdOrderByCreatedAtDesc(Long studentId) {
        String sql = "SELECT * FROM " + tableRef("certificates") +
                " WHERE student_id=@sid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId))
                .build();
        TableResult result = executeQuery(q);
        List<Certificate> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Certificate> findByCertificateTypeOrderByCreatedAtDesc(String certificateType) {
        String sql = "SELECT * FROM " + tableRef("certificates") +
                " WHERE certificate_type=@ctype ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("ctype", strParam(certificateType))
                .build();
        TableResult result = executeQuery(q);
        List<Certificate> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Certificate> findAllByOrderByCreatedAtDesc() {
        String sql = "SELECT * FROM " + tableRef("certificates") + " ORDER BY created_at DESC";
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Certificate> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsByCertificateId(String certificateId) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("certificates") + " WHERE certificate_id=@certid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("certid", strParam(certificateId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("certificates") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByStudentId(Long studentId) {
        String sql = "DELETE FROM " + tableRef("certificates") + " WHERE student_id=@sid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(studentId)).build());
    }
}
