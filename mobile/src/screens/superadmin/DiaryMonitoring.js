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

export default function DiaryMonitoring() {
  const [showAll, setShowAll] = useState(false);
  const { data, loading, isOffline } = useCachedFetch('/api/diary');
  const [entries, setEntries] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { if (data) setEntries(data); }, [data]);

  const action = async (id, reviewStatus) => {
    setActionLoading(id + reviewStatus);
    try {
      await api.patch(`/api/diary/${id}/review`, { reviewStatus, adminComment: '' });
      setEntries(prev => prev.map(e => (e.id === id ? { ...e, reviewStatus } : e)));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update diary entry.');
    } finally {
      setActionLoading(null);
    }
  };

  const visible = showAll ? entries : entries.filter(e => (e.reviewStatus || 'PENDING') === 'PENDING');

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

      {loading && entries.length === 0 ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#4338ca" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={<OfflineBanner visible={isOffline} />}
          renderItem={({ item }) => {
            const status = item.reviewStatus || 'PENDING';
            const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.className}{item.section ? `-${item.section}` : ''} · {item.subject}</Text>
                    <Text style={styles.teacher}>👨‍🏫 {item.teacherName} · 📅 {item.diaryDate}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
                  </View>
                </View>
                {item.topic ? <Text style={styles.detailRow}>📖 Topic: {item.topic}</Text> : null}
                {item.homework ? <Text style={styles.detailRow}>📝 Homework: {item.homework}</Text> : null}
                {item.remarks ? <Text style={styles.detailRow}>💬 Remarks: {item.remarks}</Text> : null}
                {item.imageUrl ? <Text style={styles.docs}>📎 Image attached</Text> : null}
                {item.adminComment ? <Text style={styles.comment}>🗨️ {item.adminComment}</Text> : null}
                {status === 'PENDING' && (
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
          ListEmptyComponent={<Text style={styles.empty}>No {showAll ? '' : 'pending '}diary entries.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#4338ca' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  teacher: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { fontSize: 12, color: '#374151', marginBottom: 4 },
  docs: { fontSize: 12, color: '#4338ca', fontWeight: '600', marginTop: 2 },
  comment: { fontSize: 12, color: '#4338ca', fontStyle: 'italic', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
