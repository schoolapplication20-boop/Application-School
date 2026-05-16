import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import api from '../../services/api';

const EXAM_TYPES = ['All', 'Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam', 'Annual Exam'];

const gradeColor = (g) => ({
  O: '#059669', 'A+': '#2563eb', A: '#7c3aed',
  'B+': '#d97706', B: '#f59e0b', 'B-': '#ea580c',
  C: '#dc2626', F: '#991b1b',
}[g] || '#64748b');

export default function StudentMarks() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/api/student/marks')
      .then(res => setMarks(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? marks : marks.filter(m => m.examType === filter);

  const subjectMap = filtered.reduce((acc, m) => {
    if (!acc[m.subject]) acc[m.subject] = [];
    acc[m.subject].push(m);
    return acc;
  }, {});

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#ca8a04" />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {EXAM_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, filter === t && styles.chipActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.chipText, filter === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={Object.keys(subjectMap)}
        keyExtractor={s => s}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: subject }) => {
          const subjectMarks = subjectMap[subject];
          const avgPct = subjectMarks.reduce((sum, m) => sum + (m.marks / m.maxMarks) * 100, 0) / subjectMarks.length;
          return (
            <View style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectName}>{subject}</Text>
                <Text style={styles.avgPct}>{Math.round(avgPct)}% avg</Text>
              </View>
              {subjectMarks.map((m, i) => (
                <View key={i} style={styles.markRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examType}>{m.examType}</Text>
                    <Text style={styles.examDate}>{m.examDate}</Text>
                  </View>
                  <Text style={styles.score}>{m.marks}/{m.maxMarks}</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor(m.grade) + '20' }]}>
                    <Text style={[styles.gradeText, { color: gradeColor(m.grade) }]}>{m.grade}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No marks recorded yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  filterRow: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, maxHeight: 56 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#ca8a04', borderColor: '#ca8a04' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  subjectCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subjectName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  avgPct: { fontSize: 13, fontWeight: '700', color: '#ca8a04' },
  markRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 6 },
  examType: { fontSize: 13, fontWeight: '600', color: '#374151' },
  examDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  score: { fontSize: 14, fontWeight: '700', color: '#374151', marginRight: 10 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 13, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
