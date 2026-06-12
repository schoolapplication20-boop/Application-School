import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_COLORS = {
  PRESENT: { bg: '#dcfce7', text: '#166534' },
  ABSENT:  { bg: '#fee2e2', text: '#991b1b' },
  LEAVE:   { bg: '#fef9c3', text: '#854d0e' },
  LATE:    { bg: '#fff7ed', text: '#9a3412' },
  HOLIDAY: { bg: '#f1f5f9', text: '#475569' },
  OTHERS:  { bg: '#ede9fe', text: '#5b21b6' },
};

export default function StudentAttendance() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const today = new Date().toISOString().split('T')[0];
  const start = `${new Date().getFullYear()}-01-01`;
  const { data, loading, isOffline } = useCachedFetch('/api/student/attendance', { startDate: start, endDate: today });
  const records = data || [];

  const filtered = useMemo(() =>
    records.filter(r => r.date && new Date(r.date + 'T00:00:00').getMonth() === selectedMonth),
    [records, selectedMonth]
  );

  const summary = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter(r => r.status === 'PRESENT').length;
    const absent = filtered.filter(r => r.status === 'ABSENT').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, pct };
  }, [filtered]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthRow}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={m}
            style={[styles.monthChip, selectedMonth === i && styles.monthChipActive]}
            onPress={() => setSelectedMonth(i)}
          >
            <Text style={[styles.monthText, selectedMonth === i && styles.monthTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.summaryCard}>
        <View style={styles.pctCircle}>
          <Text style={styles.pctValue}>{summary.pct}%</Text>
        </View>
        <View style={styles.summaryDetails}>
          <Text style={styles.summaryTitle}>Attendance — {MONTHS[selectedMonth]}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.presentCount}>✅ Present: {summary.present}</Text>
            <Text style={styles.absentCount}>❌ Absent: {summary.absent}</Text>
          </View>
          <Text style={styles.totalCount}>Total days: {summary.total}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const s = STATUS_COLORS[item.status] || STATUS_COLORS.OTHERS;
          return (
            <View style={styles.row}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.day}>{new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No records for {MONTHS[selectedMonth]}.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  monthRow: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 10, maxHeight: 56 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 6, marginRight: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  monthChipActive: { backgroundColor: '#2563eb' },
  monthText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  monthTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#2563eb', margin: 12, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  pctCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  pctValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryDetails: { flex: 1 },
  summaryTitle: { color: '#bfdbfe', fontSize: 13, marginBottom: 6 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  presentCount: { color: '#fff', fontSize: 13, fontWeight: '600' },
  absentCount: { color: '#fecaca', fontSize: 13, fontWeight: '600' },
  totalCount: { color: '#bfdbfe', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8 },
  date: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600' },
  day: { fontSize: 12, color: '#94a3b8', marginRight: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
