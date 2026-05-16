import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

const STATUS_COLORS = {
  Active: { bg: '#dcfce7', text: '#166534' },
  Inactive: { bg: '#f1f5f9', text: '#64748b' },
  Overdue: { bg: '#fee2e2', text: '#991b1b' },
};

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/student/assignments')
      .then(res => setAssignments(res.data.data || []))
      .catch(() => {
        api.get('/api/teacher/assignments/my-class')
          .then(res => setAssignments(res.data.data || []))
          .catch(() => {})
          .finally(() => setLoading(false));
        return;
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#d97706" />;

  return (
    <FlatList
      style={styles.container}
      data={assignments}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const s = STATUS_COLORS[item.status] || STATUS_COLORS.Active;
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
        return (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{item.status || 'Active'}</Text>
              </View>
            </View>
            {item.classSection && <Text style={styles.classInfo}>📚 {item.classSection}</Text>}
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <View style={styles.footer}>
              {item.dueDate && (
                <Text style={[styles.due, isOverdue && styles.overdue]}>
                  📅 Due: {item.dueDate}
                </Text>
              )}
              {item.maxMarks && <Text style={styles.marks}>Max: {item.maxMarks}</Text>}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No assignments found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  classInfo: { fontSize: 12, color: '#d97706', fontWeight: '600', marginBottom: 6 },
  desc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  due: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  overdue: { color: '#ef4444' },
  marks: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
