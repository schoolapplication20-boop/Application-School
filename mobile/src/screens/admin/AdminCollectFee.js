import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../../services/api';
import OfflineBanner from '../../components/OfflineBanner';

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT', 'RTGS', 'Cheque', 'DD', 'Card', 'Online'];

const STATUS_STYLE = {
  PAID: { bg: '#dcfce7', text: '#166534', label: 'Paid' },
  PARTIAL: { bg: '#fef9c3', text: '#854d0e', label: 'Partial' },
  PENDING: { bg: '#fee2e2', text: '#991b1b', label: 'Pending' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b', label: 'Overdue' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const genReceipt = () => `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const effectiveDue = (inst) => {
  if (inst.effectiveDue != null) return Number(inst.effectiveDue);
  return Math.max(0, Number(inst.amount || 0) + Number(inst.carryOver || 0) - Number(inst.paidAmount || 0));
};

export default function AdminCollectFee() {
  const [step, setStep] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loadingFee, setLoadingFee] = useState(false);
  const [hasAssignment, setHasAssignment] = useState(true);

  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const res = await api.get('/api/admin/students/search', { params: { q: query.trim() } });
        setResults(res.data?.data ?? res.data ?? []);
      } catch {
        setSearchError(true);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const loadFeeData = async (studentId) => {
    setLoadingFee(true);
    setAssignment(null);
    setInstallments([]);
    setSelectedInstallment(null);
    try {
      const aRes = await api.get(`/api/admin/student-fee-assignments/student/${studentId}`);
      const a = aRes.data?.data ?? aRes.data;
      setAssignment(a || null);
      setHasAssignment(true);
      if (a?.id) {
        const iRes = await api.get(`/api/admin/student-fee-assignments/${a.id}/installments`);
        setInstallments(iRes.data?.data ?? iRes.data ?? []);
      }
    } catch {
      setAssignment(null);
      setHasAssignment(false);
    } finally {
      setLoadingFee(false);
    }
  };

  const selectStudent = (s) => {
    setStudent(s);
    setStep('detail');
    setReceiptData(null);
    loadFeeData(s.id);
  };

  const pickInstallment = (inst) => {
    setSelectedInstallment(inst);
    setAmount(String(effectiveDue(inst)));
    setPaymentMode('Cash');
    setRemarks('');
    setReceiptNo(genReceipt());
    setReceiptData(null);
  };

  const handlePay = async () => {
    const amt = Number(amount);
    const maxDue = effectiveDue(selectedInstallment);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    if (amt > maxDue) { Alert.alert('Error', `Amount exceeds the due amount of ₹${fmt(maxDue)} for this term.`); return; }

    setSubmitting(true);
    try {
      await api.post(`/api/admin/fee-installments/${selectedInstallment.id}/pay`, {
        amountPaid: amt,
        paidDate: todayStr(),
        paymentMode,
        receiptNumber: receiptNo,
        remarks,
      });
      const term = selectedInstallment.termName;
      await loadFeeData(student.id);
      const aRes = await api.get(`/api/admin/student-fee-assignments/student/${student.id}`);
      const updated = aRes.data?.data ?? aRes.data;
      setReceiptData({
        receiptNo,
        amountPaid: amt,
        term,
        paidSoFar: updated?.paidAmount,
        dueAmount: Math.max(0, Number(updated?.totalFee || 0) - Number(updated?.paidAmount || 0)),
        status: updated?.status,
      });
      setSelectedInstallment(null);
      setAmount('');
      setRemarks('');
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('search');
    setQuery('');
    setResults([]);
    setStudent(null);
    setAssignment(null);
    setInstallments([]);
    setSelectedInstallment(null);
    setReceiptData(null);
  };

  if (step === 'search') {
    return (
      <View style={styles.container}>
        <FlatList
          data={results}
          keyExtractor={s => s.id.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={
            <TextInput
              style={styles.search}
              placeholder="Search by name, roll number or phone..."
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultCard} onPress={() => selectStudent(item)}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>Class {item.className}{item.section ? `-${item.section}` : ''} · Roll {item.rollNumber || '—'}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searching ? <ActivityIndicator color="#7c3aed" style={{ marginTop: 20 }} /> :
            searchError ? <Text style={styles.empty}>Search failed. Check your connection.</Text> :
            query.trim().length >= 2 ? <Text style={styles.empty}>No students found.</Text> :
            <Text style={styles.empty}>Type at least 2 characters to search.</Text>
          }
        />
      </View>
    );
  }

  const due = assignment ? Math.max(0, Number(assignment.totalFee || 0) - Number(assignment.paidAmount || 0)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={reset}>
        <Text style={styles.backBtnText}>← Search Another Student</Text>
      </TouchableOpacity>

      <View style={styles.studentCard}>
        <View style={styles.cardTop}>
          <View style={styles.avatarLg}><Text style={styles.avatarLgText}>{student?.name?.[0]}</Text></View>
          <View>
            <Text style={styles.studentName}>{student?.name}</Text>
            <Text style={styles.meta}>Class {student?.className}{student?.section ? `-${student.section}` : ''} · Roll {student?.rollNumber || '—'}</Text>
          </View>
        </View>

        {loadingFee ? (
          <ActivityIndicator color="#7c3aed" style={{ marginTop: 16 }} />
        ) : !hasAssignment || !assignment ? (
          <Text style={styles.noAssignment}>No fee assigned to this student yet.</Text>
        ) : (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Fee</Text>
              <Text style={styles.summaryVal}>₹{fmt(assignment.totalFee)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryVal, { color: '#16a34a' }]}>₹{fmt(assignment.paidAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due</Text>
              <Text style={[styles.summaryVal, { color: due > 0 ? '#dc2626' : '#16a34a', fontSize: 15 }]}>₹{fmt(due)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: (STATUS_STYLE[assignment.status] || STATUS_STYLE.PENDING).bg, alignSelf: 'flex-start', marginTop: 6 }]}>
              <Text style={[styles.badgeText, { color: (STATUS_STYLE[assignment.status] || STATUS_STYLE.PENDING).text }]}>
                {(STATUS_STYLE[assignment.status] || STATUS_STYLE.PENDING).label}
              </Text>
            </View>
          </View>
        )}
      </View>

      {assignment && installments.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Installments</Text>
          {installments.map(inst => {
            const status = inst.status;
            const isPaid = status === 'PAID';
            const eff = effectiveDue(inst);
            const selected = selectedInstallment?.id === inst.id;
            return (
              <TouchableOpacity
                key={inst.id}
                style={[styles.instRow, selected && styles.instRowSelected, isPaid && styles.instRowPaid]}
                onPress={() => !isPaid && pickInstallment(inst)}
                disabled={isPaid}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.instTerm}>{inst.termName}</Text>
                  <Text style={styles.instDue}>Due: {inst.dueDate || '—'}</Text>
                  {Number(inst.carryOver) > 0 && (
                    <Text style={styles.instCarry}>↪ ₹{fmt(inst.carryOver)} carried from previous term</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.instAmount, { color: isPaid ? '#166534' : '#1e293b' }]}>₹{fmt(isPaid ? inst.amount : eff)}</Text>
                  <View style={[styles.badge, { backgroundColor: (STATUS_STYLE[status] || STATUS_STYLE.PENDING).bg }]}>
                    <Text style={[styles.badgeText, { color: (STATUS_STYLE[status] || STATUS_STYLE.PENDING).text }]}>
                      {isPaid ? '✓ Paid' : selected ? 'Selected' : 'Tap to pay'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedInstallment && (
        <View style={styles.payForm}>
          <Text style={styles.panelTitle}>Collect: {selectedInstallment.termName}</Text>
          <Text style={styles.label}>Amount Received (₹) — Max ₹{fmt(effectiveDue(selectedInstallment))}</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

          <Text style={styles.label}>Payment Mode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {PAYMENT_MODES.map(m => (
              <TouchableOpacity key={m} style={[styles.modeChip, paymentMode === m && styles.modeChipActive]} onPress={() => setPaymentMode(m)}>
                <Text style={[styles.modeChipText, paymentMode === m && styles.modeChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Receipt No.</Text>
          <Text style={styles.receiptNo}>{receiptNo}</Text>

          <Text style={styles.label}>Remarks</Text>
          <TextInput style={styles.input} value={remarks} onChangeText={setRemarks} placeholder="Optional" />

          <TouchableOpacity style={[styles.payBtn, submitting && { opacity: 0.7 }]} onPress={handlePay} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Collect ₹{amount ? fmt(amount) : '—'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {receiptData && (
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>✓ Payment Recorded</Text>
          <View style={styles.receiptRow}><Text style={styles.summaryLabel}>Receipt No</Text><Text style={styles.summaryVal}>{receiptData.receiptNo}</Text></View>
          {receiptData.term && <View style={styles.receiptRow}><Text style={styles.summaryLabel}>Term</Text><Text style={styles.summaryVal}>{receiptData.term}</Text></View>}
          <View style={styles.receiptRow}><Text style={styles.summaryLabel}>Amount Paid</Text><Text style={[styles.summaryVal, { color: '#16a34a' }]}>₹{fmt(receiptData.amountPaid)}</Text></View>
          <View style={styles.receiptRow}><Text style={styles.summaryLabel}>Total Paid</Text><Text style={styles.summaryVal}>₹{fmt(receiptData.paidSoFar)}</Text></View>
          <View style={styles.receiptRow}><Text style={styles.summaryLabel}>Balance Due</Text><Text style={[styles.summaryVal, { color: receiptData.dueAmount > 0 ? '#dc2626' : '#16a34a' }]}>{receiptData.dueAmount > 0 ? `₹${fmt(receiptData.dueAmount)}` : 'NIL'}</Text></View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  search: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#fff' },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  avatarLg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarLgText: { fontSize: 18, fontWeight: '800', color: '#7c3aed' },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  arrow: { fontSize: 20, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  studentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  studentName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  noAssignment: { textAlign: 'center', color: '#94a3b8', marginTop: 16, fontSize: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  summary: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#64748b' },
  summaryVal: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  panel: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1 },
  panelTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  instRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  instRowSelected: { backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 8 },
  instRowPaid: { opacity: 0.6 },
  instTerm: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  instDue: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  instCarry: { fontSize: 10, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  instAmount: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  payForm: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#7c3aed' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 8, backgroundColor: '#f8fafc' },
  modeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc' },
  modeChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  modeChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  modeChipTextActive: { color: '#fff' },
  receiptNo: { fontSize: 12, fontFamily: 'monospace', color: '#64748b', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  payBtn: { backgroundColor: '#7c3aed', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  receiptCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 2, borderColor: '#16a34a' },
  receiptTitle: { fontSize: 15, fontWeight: '800', color: '#166534', marginBottom: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
