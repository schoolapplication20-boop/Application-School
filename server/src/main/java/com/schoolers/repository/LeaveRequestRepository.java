package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.LeaveRequest;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class LeaveRequestRepository extends BigQueryBaseRepository {

    private LeaveRequest map(com.google.cloud.bigquery.FieldValueList row) {
        LeaveRequest lr = new LeaveRequest();
        lr.setId(longVal(row, "id"));
        String rtStr = str(row, "requester_type");
        if (rtStr != null) lr.setRequesterType(LeaveRequest.RequesterType.valueOf(rtStr));
        lr.setRequesterId(longVal(row, "requester_id"));
        lr.setRequesterName(str(row, "requester_name"));
        lr.setClassSection(str(row, "class_section"));
        lr.setLeaveType(str(row, "leave_type"));
        lr.setFromDate(dateVal(row, "from_date"));
        lr.setToDate(dateVal(row, "to_date"));
        lr.setReason(str(row, "reason"));
        String statusStr = str(row, "status");
        if (statusStr != null) lr.setStatus(LeaveRequest.Status.valueOf(statusStr));
        lr.setAdminComment(str(row, "admin_comment"));
        lr.setReviewedAt(datetimeVal(row, "reviewed_at"));
        lr.setReviewedBy(str(row, "reviewed_by"));
        lr.setCreatedAt(datetimeVal(row, "created_at"));
        lr.setUpdatedAt(datetimeVal(row, "updated_at"));
        return lr;
    }

    public LeaveRequest save(LeaveRequest lr) {
        if (lr.getId() == null) {
            lr.setId(generateNextId("leave_requests"));
            lr.setCreatedAt(now());
            lr.setUpdatedAt(now());
            String sql = "INSERT INTO " + tableRef("leave_requests") +
                    " (id,requester_type,requester_id,requester_name,class_section,leave_type,from_date,to_date," +
                    "reason,status,admin_comment,reviewed_at,reviewed_by,created_at,updated_at)" +
                    " VALUES (@id,@rtype,@rid,@rname,@cs,@ltype,@fdate,@tdate,@reason,@status,@acomment,@rat,@rby,@ca,@ua)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(lr.getId()))
                    .addNamedParameter("rtype", strParam(lr.getRequesterType() != null ? lr.getRequesterType().name() : null))
                    .addNamedParameter("rid", int64Param(lr.getRequesterId()))
                    .addNamedParameter("rname", strParam(lr.getRequesterName()))
                    .addNamedParameter("cs", strParam(lr.getClassSection()))
                    .addNamedParameter("ltype", strParam(lr.getLeaveType()))
                    .addNamedParameter("fdate", dateParam(lr.getFromDate()))
                    .addNamedParameter("tdate", dateParam(lr.getToDate()))
                    .addNamedParameter("reason", strParam(lr.getReason()))
                    .addNamedParameter("status", strParam(lr.getStatus() != null ? lr.getStatus().name() : null))
                    .addNamedParameter("acomment", strParam(lr.getAdminComment()))
                    .addNamedParameter("rat", datetimeParam(lr.getReviewedAt()))
                    .addNamedParameter("rby", strParam(lr.getReviewedBy()))
                    .addNamedParameter("ca", datetimeParam(lr.getCreatedAt()))
                    .addNamedParameter("ua", datetimeParam(lr.getUpdatedAt()))
                    .build();
            executeQuery(q);
        } else {
            lr.setUpdatedAt(now());
            String sql = "UPDATE " + tableRef("leave_requests") +
                    " SET requester_type=@rtype,requester_id=@rid,requester_name=@rname,class_section=@cs," +
                    "leave_type=@ltype,from_date=@fdate,to_date=@tdate,reason=@reason,status=@status," +
                    "admin_comment=@acomment,reviewed_at=@rat,reviewed_by=@rby,updated_at=@ua WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("rtype", strParam(lr.getRequesterType() != null ? lr.getRequesterType().name() : null))
                    .addNamedParameter("rid", int64Param(lr.getRequesterId()))
                    .addNamedParameter("rname", strParam(lr.getRequesterName()))
                    .addNamedParameter("cs", strParam(lr.getClassSection()))
                    .addNamedParameter("ltype", strParam(lr.getLeaveType()))
                    .addNamedParameter("fdate", dateParam(lr.getFromDate()))
                    .addNamedParameter("tdate", dateParam(lr.getToDate()))
                    .addNamedParameter("reason", strParam(lr.getReason()))
                    .addNamedParameter("status", strParam(lr.getStatus() != null ? lr.getStatus().name() : null))
                    .addNamedParameter("acomment", strParam(lr.getAdminComment()))
                    .addNamedParameter("rat", datetimeParam(lr.getReviewedAt()))
                    .addNamedParameter("rby", strParam(lr.getReviewedBy()))
                    .addNamedParameter("ua", datetimeParam(lr.getUpdatedAt()))
                    .addNamedParameter("id", int64Param(lr.getId()))
                    .build();
            executeQuery(q);
        }
        return lr;
    }

    public Optional<LeaveRequest> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("leave_requests") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<LeaveRequest> findAll() {
        String sql = "SELECT * FROM " + tableRef("leave_requests");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<LeaveRequest> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("leave_requests") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<LeaveRequest> findByRequesterType(LeaveRequest.RequesterType requesterType) {
        String sql = "SELECT * FROM " + tableRef("leave_requests") + " WHERE requester_type=@rtype";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rtype", strParam(requesterType.name()))
                .build();
        TableResult result = executeQuery(q);
        List<LeaveRequest> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<LeaveRequest> findByRequesterId(Long requesterId) {
        String sql = "SELECT * FROM " + tableRef("leave_requests") + " WHERE requester_id=@rid";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(requesterId))
                .build();
        TableResult result = executeQuery(q);
        List<LeaveRequest> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<LeaveRequest> findByRequesterTypeAndStatus(LeaveRequest.RequesterType requesterType, LeaveRequest.Status status) {
        String sql = "SELECT * FROM " + tableRef("leave_requests") + " WHERE requester_type=@rtype AND status=@status";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rtype", strParam(requesterType.name()))
                .addNamedParameter("status", strParam(status.name()))
                .build();
        TableResult result = executeQuery(q);
        List<LeaveRequest> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<LeaveRequest> findByRequesterIdAndRequesterType(Long requesterId, LeaveRequest.RequesterType requesterType) {
        String sql = "SELECT * FROM " + tableRef("leave_requests") + " WHERE requester_id=@rid AND requester_type=@rtype";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(requesterId))
                .addNamedParameter("rtype", strParam(requesterType.name()))
                .build();
        TableResult result = executeQuery(q);
        List<LeaveRequest> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("leave_requests") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue() > 0;
        }
        return false;
    }

    public void deleteByRequesterId(Long requesterId) {
        String sql = "DELETE FROM " + tableRef("leave_requests") + " WHERE requester_id=@rid";
        executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(requesterId)).build());
    }
}
