package com.schoolers.repository;

import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.TableResult;
import com.schoolers.model.Message;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class MessageRepository extends BigQueryBaseRepository {

    private Message map(com.google.cloud.bigquery.FieldValueList row) {
        Message m = new Message();
        m.setId(longVal(row, "id"));
        m.setSenderId(longVal(row, "sender_id"));
        m.setSenderName(str(row, "sender_name"));
        m.setSenderRole(str(row, "sender_role"));
        m.setReceiverId(longVal(row, "receiver_id"));
        m.setReceiverName(str(row, "receiver_name"));
        m.setReceiverRole(str(row, "receiver_role"));
        m.setContent(str(row, "content"));
        m.setIsRead(boolVal(row, "is_read"));
        m.setCreatedAt(datetimeVal(row, "created_at"));
        return m;
    }

    public Message save(Message m) {
        if (m.getId() == null) {
            m.setId(generateNextId("messages"));
            m.setCreatedAt(now());
            String sql = "INSERT INTO " + tableRef("messages") +
                    " (id,sender_id,sender_name,sender_role,receiver_id,receiver_name,receiver_role,content,is_read,created_at)" +
                    " VALUES (@id,@sid,@sname,@srole,@rid,@rname,@rrole,@content,@isread,@ca)";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("id", int64Param(m.getId()))
                    .addNamedParameter("sid", int64Param(m.getSenderId()))
                    .addNamedParameter("sname", strParam(m.getSenderName()))
                    .addNamedParameter("srole", strParam(m.getSenderRole()))
                    .addNamedParameter("rid", int64Param(m.getReceiverId()))
                    .addNamedParameter("rname", strParam(m.getReceiverName()))
                    .addNamedParameter("rrole", strParam(m.getReceiverRole()))
                    .addNamedParameter("content", strParam(m.getContent()))
                    .addNamedParameter("isread", boolParam(m.getIsRead()))
                    .addNamedParameter("ca", datetimeParam(m.getCreatedAt()))
                    .build();
            executeQuery(q);
        } else {
            String sql = "UPDATE " + tableRef("messages") +
                    " SET sender_id=@sid,sender_name=@sname,sender_role=@srole,receiver_id=@rid," +
                    "receiver_name=@rname,receiver_role=@rrole,content=@content,is_read=@isread WHERE id=@id";
            QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("sid", int64Param(m.getSenderId()))
                    .addNamedParameter("sname", strParam(m.getSenderName()))
                    .addNamedParameter("srole", strParam(m.getSenderRole()))
                    .addNamedParameter("rid", int64Param(m.getReceiverId()))
                    .addNamedParameter("rname", strParam(m.getReceiverName()))
                    .addNamedParameter("rrole", strParam(m.getReceiverRole()))
                    .addNamedParameter("content", strParam(m.getContent()))
                    .addNamedParameter("isread", boolParam(m.getIsRead()))
                    .addNamedParameter("id", int64Param(m.getId()))
                    .build();
            executeQuery(q);
        }
        return m;
    }

    public Optional<Message> findById(Long id) {
        String sql = "SELECT * FROM " + tableRef("messages") + " WHERE id=@id LIMIT 1";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return Optional.of(map(row));
        }
        return Optional.empty();
    }

    public List<Message> findAll() {
        String sql = "SELECT * FROM " + tableRef("messages");
        TableResult result = executeQuery(QueryJobConfiguration.of(sql));
        List<Message> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM " + tableRef("messages") + " WHERE id=@id";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(id))
                .build();
        executeQuery(q);
    }

    public List<Message> findByReceiverIdOrderByCreatedAtDesc(Long receiverId) {
        String sql = "SELECT * FROM " + tableRef("messages") + " WHERE receiver_id=@rid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(receiverId))
                .build();
        TableResult result = executeQuery(q);
        List<Message> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Message> findBySenderIdOrderByCreatedAtDesc(Long senderId) {
        String sql = "SELECT * FROM " + tableRef("messages") + " WHERE sender_id=@sid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("sid", int64Param(senderId))
                .build();
        TableResult result = executeQuery(q);
        List<Message> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Message> findAllByUserId(Long userId) {
        String sql = "SELECT * FROM " + tableRef("messages") +
                " WHERE sender_id=@uid OR receiver_id=@uid ORDER BY created_at DESC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("uid", int64Param(userId))
                .build();
        TableResult result = executeQuery(q);
        List<Message> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public List<Message> findConversation(Long u1, Long u2) {
        String sql = "SELECT * FROM " + tableRef("messages") +
                " WHERE (sender_id=@u1 AND receiver_id=@u2) OR (sender_id=@u2 AND receiver_id=@u1)" +
                " ORDER BY created_at ASC";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("u1", int64Param(u1))
                .addNamedParameter("u2", int64Param(u2))
                .build();
        TableResult result = executeQuery(q);
        List<Message> list = new ArrayList<>();
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            list.add(map(row));
        }
        return list;
    }

    public long countByReceiverIdAndIsReadFalse(Long receiverId) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("messages") +
                " WHERE receiver_id=@rid AND is_read=FALSE";
        QueryJobConfiguration q = QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("rid", int64Param(receiverId))
                .build();
        TableResult result = executeQuery(q);
        for (com.google.cloud.bigquery.FieldValueList row : result.iterateAll()) {
            return row.get("cnt").getLongValue();
        }
        return 0L;
    }

    public boolean existsById(Long id) {
        String sql = "SELECT COUNT(1) AS cnt FROM " + tableRef("messages") + " WHERE id=@id";
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
