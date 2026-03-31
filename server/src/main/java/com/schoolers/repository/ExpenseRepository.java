package com.schoolers.repository;

import com.google.cloud.bigquery.*;
import com.schoolers.model.Expense;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Repository
public class ExpenseRepository extends BigQueryBaseRepository {
    private static final String T = "expenses";
    private String tbl() { return tableRef(T); }

    private Expense map(FieldValueList r) {
        Expense e = new Expense();
        e.setId(longVal(r, "id"));
        e.setCategory(str(r, "category"));
        e.setAmount(decimalVal(r, "amount"));
        e.setDescription(str(r, "description"));
        e.setDate(dateVal(r, "date"));
        e.setAddedBy(str(r, "added_by"));
        e.setAddedById(longVal(r, "added_by_id"));
        e.setCreatedAt(datetimeVal(r, "created_at"));
        e.setUpdatedAt(datetimeVal(r, "updated_at"));
        return e;
    }

    public Expense save(Expense e) {
        if (e.getId() == null) {
            e.setId(generateNextId(T));
            e.setCreatedAt(now());
            e.setUpdatedAt(now());
            String sql = "INSERT INTO " + tbl() + " (id,category,amount,description,date,added_by,added_by_id,created_at,updated_at) VALUES (@id,@cat,@amt,@desc,@date,@addedby,@addedbyid,@ca,@ua)";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(e.getId()))
                .addNamedParameter("cat", strParam(e.getCategory()))
                .addNamedParameter("amt", numericParam(e.getAmount()))
                .addNamedParameter("desc", strParam(e.getDescription()))
                .addNamedParameter("date", dateParam(e.getDate()))
                .addNamedParameter("addedby", strParam(e.getAddedBy()))
                .addNamedParameter("addedbyid", int64Param(e.getAddedById()))
                .addNamedParameter("ca", datetimeParam(e.getCreatedAt()))
                .addNamedParameter("ua", datetimeParam(e.getUpdatedAt()))
                .build());
        } else {
            e.setUpdatedAt(now());
            String sql = "UPDATE " + tbl() + " SET category=@cat,amount=@amt,description=@desc,date=@date,added_by=@addedby,added_by_id=@addedbyid,updated_at=@ua WHERE id=@id";
            executeQuery(QueryJobConfiguration.newBuilder(sql)
                .addNamedParameter("id", int64Param(e.getId()))
                .addNamedParameter("cat", strParam(e.getCategory()))
                .addNamedParameter("amt", numericParam(e.getAmount()))
                .addNamedParameter("desc", strParam(e.getDescription()))
                .addNamedParameter("date", dateParam(e.getDate()))
                .addNamedParameter("addedby", strParam(e.getAddedBy()))
                .addNamedParameter("addedbyid", int64Param(e.getAddedById()))
                .addNamedParameter("ua", datetimeParam(e.getUpdatedAt()))
                .build());
        }
        return e;
    }

    public Optional<Expense> findById(Long id) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE id=@id")
            .addNamedParameter("id", int64Param(id)).build());
        Iterator<FieldValueList> it = r.iterateAll().iterator();
        return it.hasNext() ? Optional.of(map(it.next())) : Optional.empty();
    }

    public List<Expense> findAll() {
        List<Expense> list = new ArrayList<>();
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

    public List<Expense> findByCategory(String category) {
        List<Expense> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE category=@cat")
            .addNamedParameter("cat", strParam(category)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public List<Expense> findByDateBetween(LocalDate startDate, LocalDate endDate) {
        List<Expense> list = new ArrayList<>();
        executeQuery(QueryJobConfiguration.newBuilder("SELECT * FROM " + tbl() + " WHERE date >= @start AND date <= @end")
            .addNamedParameter("start", dateParam(startDate))
            .addNamedParameter("end", dateParam(endDate)).build())
            .iterateAll().forEach(row -> list.add(map(row)));
        return list;
    }

    public BigDecimal sumExpensesByMonth(int month, int year) {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COALESCE(SUM(amount), 0) as total FROM " + tbl() + " WHERE EXTRACT(MONTH FROM date)=@month AND EXTRACT(YEAR FROM date)=@year")
            .addNamedParameter("month", int64Param((long) month))
            .addNamedParameter("year", int64Param((long) year)).build());
        return decimalVal(r.iterateAll().iterator().next(), "total");
    }

    public BigDecimal sumAllExpenses() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COALESCE(SUM(amount), 0) as total FROM " + tbl()).build());
        return decimalVal(r.iterateAll().iterator().next(), "total");
    }

    public long count() {
        TableResult r = executeQuery(QueryJobConfiguration.newBuilder("SELECT COUNT(*) as cnt FROM " + tbl()).build());
        return r.iterateAll().iterator().next().get("cnt").getLongValue();
    }
}
