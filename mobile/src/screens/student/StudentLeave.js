import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import api from '../../services/api';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const LEAVE_TYPES = ['Medical', 'Personal', 'Family Emergency', 'Other'];
const STATUS_STYLE = {
  PENDING:  { bg: '#fef9c3', text: '#854d0e' },
  APPROVED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function StudentLeave() {
  const { data, loading, isOffline, reload } = useCachedFetch('/api/leave/student/my');
  const leaves = data || [];
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Medical', fromDate: '', toDate: '', reason: '' });

  const submit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }
    if (form.toDate < form.fromDate) {
      Alert.alert('Error', 'To date must be after from date.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/leave/student/submit', {
        leaveType: form.leaveType,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
      });
      Alert.alert('Success', 'Leave request submitted.');
      setModalVisible(false);
      setForm({ leaveType: 'Medical', fromDate: '', toDate: '', reason: '' });
      reload();
    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to submit leave.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0284c7" />;

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <TouchableOpacity style={styles.applyBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.applyBtnText}>+ Apply for Leave</Text>
      </TouchableOpacity>

      <Text style={styles.historyTitle}>My Leave History</Text>
      <FlatList
        data={leaves}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.leaveType}>{item.leaveType || 'Leave'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.dates}>📅 {item.fromDate} → {item.toDate}</Text>
              <Text style={styles.reason}>{item.reason}</Text>
              {item.adminComment && <Text style={styles.comment}>💬 {item.adminComment}</Text>}
              {item.teacherComment && <Text style={styles.comment}>💬 {item.teacherComment}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No leave requests yet.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Leave Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {LEAVE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.leaveType === t && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, leaveType: t }))}
                  >
                    <Text style={[styles.typeChipText, form.leaveType === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>From Date *</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={form.fromDate} onChangeText={v => setForm(f => ({ ...f, fromDate: v }))} />
              <Text style={styles.label}>To Date *</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={form.toDate} onChangeText={v => setForm(f => ({ ...f, toDate: v }))} />
              <Text style={styles.label}>Reason *</Text>
              <TextInput style={[styles.input, { height: 90 }]} placeholder="Reason for leave..." value={form.reason} onChangeText={v => setForm(f => ({ ...f, reason: v }))} multiline />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
                  <Text style={styles.saveText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  applyBtn: { backgroundColor: '#0284c7', margin: 12, borderRadius: 12, padding: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 14, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leaveType: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  dates: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  reason: { fontSize: 13, color: '#374151' },
  comment: { fontSize: 12, color: '#2563eb', marginTop: 6, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#f8fafc' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc' },
  typeChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  typeChipTextActive: { color: '#fff' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: '#0284c7', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#fff' },
});
