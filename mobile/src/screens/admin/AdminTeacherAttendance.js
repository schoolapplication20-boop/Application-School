import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const STATUS_STYLE = {
  PRESENT: { bg: '#dcfce7', text: '#166534' },
  ABSENT: { bg: '#fee2e2', text: '#991b1b' },
  LEAVE: { bg: '#fef9c3', text: '#854d0e' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function AdminTeacherAttendance() {
  const [date, setDate] = useState(todayStr());
  const { data, loading, isOffline } = useCachedFetch('/api/teacher-attendance/by-date', { date });
  const records = data || [];

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  if (loading && records.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
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
          const s = STATUS_STYLE[item.status] || STATUS_STYLE.PRESENT;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{item.teacherName}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
                </View>
              </View>
              {item.note ? <Text style={styles.note}>📝 {item.note}</Text> : null}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No attendance records for this date.</Text>}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  note: { fontSize: 12, color: '#64748b', marginTop: 6 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
