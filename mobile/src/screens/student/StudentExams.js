import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

const STATUS_STYLE = {
  SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8' },
  ONGOING:   { bg: '#dcfce7', text: '#166534' },
  COMPLETED: { bg: '#f1f5f9', text: '#64748b' },
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr + 'T00:00:00') - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

export default function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/examination/schedules')
      .then(res => setExams(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#9333ea" />;

  return (
    <FlatList
      style={styles.container}
      data={exams}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const s = STATUS_STYLE[item.status] || STATUS_STYLE.SCHEDULED;
        const daysUntil = getDaysUntil(item.examDate);
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.examName}>{item.examName}</Text>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{item.status || 'SCHEDULED'}</Text>
              </View>
            </View>
            <Text style={styles.subject}>{item.subject || item.subjectName}</Text>
            <Text style={styles.classInfo}>📚 Class {item.className}{item.section ? `-${item.section}` : ''}</Text>
            <View style={styles.row}>
              <Text style={styles.meta}>📅 {item.examDate}</Text>
              <Text style={styles.meta}>⏰ {item.startTime} — {item.endTime}</Text>
            </View>
            <View style={styles.row}>
              {item.hallNumber && <Text style={styles.meta}>🏫 Hall {item.hallNumber}</Text>}
              <Text style={styles.meta}>📝 Max: {item.maxMarks}</Text>
            </View>
            {daysUntil !== null && daysUntil > 0 && item.status !== 'COMPLETED' && (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>⏳ {daysUntil} day{daysUntil !== 1 ? 's' : ''} to go</Text>
              </View>
            )}
            {daysUntil !== null && daysUntil <= 0 && item.status !== 'COMPLETED' && (
              <View style={[styles.countdownBadge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.countdownText, { color: '#991b1b' }]}>Today / Overdue</Text>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No exam schedules found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  examName: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  subject: { fontSize: 13, color: '#9333ea', fontWeight: '600', marginBottom: 4 },
  classInfo: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  meta: { fontSize: 12, color: '#64748b' },
  countdownBadge: { backgroundColor: '#fef9c3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  countdownText: { fontSize: 12, color: '#854d0e', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
