import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';

const STATUS_STYLE = {
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  APPROVED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function TeacherLeaveApproval() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    api.get('/api/leave/teacher/class')
      .then(res => setLeaves(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const action = async (id, status) => {
    setActionLoading(id + status);
    try {
      await api.put(`/api/leave/${id}/teacher-action`, { status });
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update leave.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />;

  return (
    <FlatList
      style={styles.container}
      data={leaves}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const s = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.requesterName || item.studentName}</Text>
                <Text style={styles.leaveType}>{item.leaveType}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.dates}>📅 {item.fromDate} → {item.toDate}</Text>
            <Text style={styles.reason}>{item.reason}</Text>
            {item.status === 'PENDING' && (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.approveBtn, actionLoading === item.id + 'APPROVED' && { opacity: 0.6 }]}
                  onPress={() => action(item.id, 'APPROVED')}
                  disabled={!!actionLoading}
                >
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, actionLoading === item.id + 'REJECTED' && { opacity: 0.6 }]}
                  onPress={() => action(item.id, 'REJECTED')}
                  disabled={!!actionLoading}
                >
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No pending leave requests.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  leaveType: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dates: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  reason: { fontSize: 13, color: '#374151', marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
