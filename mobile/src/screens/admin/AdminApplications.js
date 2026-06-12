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

export default function AdminApplications() {
  const [showAll, setShowAll] = useState(false);
  const { data, loading, isOffline } = useCachedFetch('/api/applications', showAll ? {} : { status: 'PENDING' });
  const [applications, setApplications] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { if (data) setApplications(data); }, [data]);

  const action = async (id, status) => {
    setActionLoading(id + status);
    try {
      await api.put(`/api/applications/${id}/status`, { status, adminNotes: '' });
      setApplications(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update application.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, !showAll && styles.tabActive]} onPress={() => setShowAll(false)}>
          <Text style={[styles.tabText, !showAll && styles.tabTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, showAll && styles.tabActive]} onPress={() => setShowAll(true)}>
          <Text style={[styles.tabText, showAll && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      {loading && applications.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={<OfflineBanner visible={isOffline} />}
          renderItem={({ item }) => {
            const s = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
            const docs = [
              item.idProof && 'ID Proof',
              item.tcDoc && 'Transfer Certificate',
              item.bonafideDoc && 'Bonafide Certificate',
            ].filter(Boolean);
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.studentName}</Text>
                    <Text style={styles.classApplied}>Applying for: {item.classApplied}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.detailRow}>👨 Father: {item.fatherName || '—'} · 📞 {item.fatherPhone || '—'}</Text>
                <Text style={styles.detailRow}>👩 Mother: {item.motherName || '—'} · 📞 {item.motherPhone || '—'}</Text>
                {item.email ? <Text style={styles.detailRow}>✉️ {item.email}</Text> : null}
                {item.prevSchool ? <Text style={styles.detailRow}>🏫 Previous School: {item.prevSchool}</Text> : null}
                {docs.length > 0 && <Text style={styles.docs}>📎 {docs.join(', ')}</Text>}
                {item.adminNotes ? <Text style={styles.comment}>💬 {item.adminNotes}</Text> : null}
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
          ListEmptyComponent={<Text style={styles.empty}>No {showAll ? '' : 'pending '}applications.</Text>}
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
  classApplied: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { fontSize: 12, color: '#374151', marginBottom: 4 },
  docs: { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginTop: 2 },
  comment: { fontSize: 12, color: '#7c3aed', fontStyle: 'italic', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
