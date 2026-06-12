import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const STATUS_STYLE = {
  Present: { bg: '#dcfce7', text: '#166534' },
  Absent: { bg: '#fee2e2', text: '#991b1b' },
  Leave: { bg: '#fef9c3', text: '#854d0e' },
  Other: { bg: '#f1f5f9', text: '#64748b' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminAttendanceReport() {
  const [date, setDate] = useState(todayStr());
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(null);

  const { data, loading, isOffline } = useCachedFetch('/api/admin/attendance/summary', { date });
  const classes = data || [];

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const toggleExpand = async (classId) => {
    if (expandedId === classId) { setExpandedId(null); return; }
    setExpandedId(classId);
    if (!details[classId]) {
      setDetailLoading(classId);
      try {
        const res = await api.get(`/api/admin/attendance/classes/${classId}/details`, { params: { date } });
        const result = res.data?.data ?? res.data;
        setDetails(prev => ({ ...prev, [classId]: result }));
      } catch {
        setDetails(prev => ({ ...prev, [classId]: { records: [] } }));
      } finally {
        setDetailLoading(null);
      }
    }
  };

  if (loading && classes.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={classes}
        keyExtractor={c => c.classId.toString()}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={
          <>
            <OfflineBanner visible={isOffline} />
            <View style={styles.dateBar}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => shiftDate(-1)}>
                <Text style={styles.dateBtnText}>◀</Text>
              </TouchableOpacity>
              <View style={styles.dateCenter}>
                <Text style={styles.dateText}>📅 {date}</Text>
                {date !== todayStr() && (
                  <TouchableOpacity onPress={() => setDate(todayStr())}>
                    <Text style={styles.todayLink}>Today</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.dateBtn} onPress={() => shiftDate(1)}>
                <Text style={styles.dateBtnText}>▶</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.classId;
          const detail = details[item.classId];
          return (
            <TouchableOpacity style={styles.card} onPress={() => toggleExpand(item.classId)}>
              <View style={styles.cardTop}>
                <Text style={styles.className}>Class {item.className}{item.section ? `-${item.section}` : ''}</Text>
                <Text style={styles.total}>{item.present + item.absent + item.leave + item.others}/{item.total}</Text>
              </View>
              <Text style={styles.teacher}>👨‍🏫 {item.teacherName || '—'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: STATUS_STYLE.Present.bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_STYLE.Present.text }]}>P: {item.present}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS_STYLE.Absent.bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_STYLE.Absent.text }]}>A: {item.absent}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS_STYLE.Leave.bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_STYLE.Leave.text }]}>L: {item.leave}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS_STYLE.Other.bg }]}>
                  <Text style={[styles.badgeText, { color: STATUS_STYLE.Other.text }]}>O: {item.others}</Text>
                </View>
              </View>
              {expanded && (
                <View style={styles.detail}>
                  {detailLoading === item.classId ? (
                    <ActivityIndicator color="#7c3aed" style={{ marginTop: 8 }} />
                  ) : (detail?.records || []).length === 0 ? (
                    <Text style={styles.empty}>No records found.</Text>
                  ) : (
                    detail.records.map((r, i) => {
                      const s = STATUS_STYLE[r.status?.charAt(0) + r.status?.slice(1).toLowerCase()] || STATUS_STYLE.Other;
                      return (
                        <View key={i} style={styles.studentRow}>
                          <Text style={styles.studentName}>{r.rollNumber ? `${r.rollNumber}. ` : ''}{r.studentName}</Text>
                          <View style={[styles.badge, { backgroundColor: s.bg }]}>
                            <Text style={[styles.badgeText, { color: s.text }]}>{r.status}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No attendance data for this date.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  dateBtn: { paddingHorizontal: 16, paddingVertical: 6 },
  dateBtnText: { fontSize: 16, color: '#7c3aed', fontWeight: '700' },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  todayLink: { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  className: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  total: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  teacher: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  studentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  studentName: { fontSize: 13, color: '#374151', flex: 1 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 8, fontSize: 13 },
});
