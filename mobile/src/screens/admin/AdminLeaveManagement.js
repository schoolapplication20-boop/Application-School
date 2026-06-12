import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const STATUS_STYLE = {
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  APPROVED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function AdminLeaveManagement() {
  const [tab, setTab] = useState('TEACHER');

  const teacherFetch = useCachedFetch('/api/leave/teacher');
  const studentFetch = useCachedFetch('/api/leave/student');

  const [teacherLeaves, setTeacherLeaves] = useState([]);
  const [studentLeaves, setStudentLeaves] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { if (teacherFetch.data) setTeacherLeaves(teacherFetch.data); }, [teacherFetch.data]);
  useEffect(() => { if (studentFetch.data) setStudentLeaves(studentFetch.data); }, [studentFetch.data]);

  const action = async (id, status) => {
    setActionLoading(id + status);
    try {
      await api.put(`/api/leave/${id}/status`, { status, adminComment: '' });
      setTeacherLeaves(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update leave.');
    } finally {
      setActionLoading(null);
    }
  };

  const isTeacherTab = tab === 'TEACHER';
  const leaves = isTeacherTab ? teacherLeaves : studentLeaves;
  const loading = isTeacherTab ? teacherFetch.loading : studentFetch.loading;
  const isOffline = isTeacherTab ? teacherFetch.isOffline : studentFetch.isOffline;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, isTeacherTab && styles.tabActive]} onPress={() => setTab('TEACHER')}>
          <Text style={[styles.tabText, isTeacherTab && styles.tabTextActive]}>Teacher Leaves</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, !isTeacherTab && styles.tabActive]} onPress={() => setTab('STUDENT')}>
          <Text style={[styles.tabText, !isTeacherTab && styles.tabTextActive]}>Student Leaves</Text>
        </TouchableOpacity>
      </View>

      {loading && leaves.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={<OfflineBanner visible={isOffline} />}
          renderItem={({ item }) => {
            const s = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.requesterName}</Text>
                    <Text style={styles.leaveType}>{item.leaveType}{item.classSection ? ` · ${item.classSection}` : ''}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.dates}>📅 {item.fromDate} → {item.toDate}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
                {item.adminComment ? <Text style={styles.comment}>💬 {item.adminComment}</Text> : null}
                {isTeacherTab && item.status === 'PENDING' && (
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
          ListEmptyComponent={<Text style={styles.empty}>No {isTeacherTab ? 'teacher' : 'student'} leave requests.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  leaveType: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dates: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  reason: { fontSize: 13, color: '#374151', marginBottom: 6 },
  comment: { fontSize: 12, color: '#7c3aed', fontStyle: 'italic', marginBottom: 6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
