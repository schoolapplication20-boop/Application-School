import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

export default function StudentDiary() {
  const { data, loading, isOffline } = useCachedFetch('/api/student/diary');
  const entries = data || [];

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#ea580c" />;

  return (
    <FlatList
      style={styles.container}
      data={entries}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 12 }}
      ListHeaderComponent={<OfflineBanner visible={isOffline} />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>
            {item.subjectName && (
              <View style={styles.subjectPill}>
                <Text style={styles.subjectText}>{item.subjectName}</Text>
              </View>
            )}
          </View>
          {item.title && <Text style={styles.title}>{item.title}</Text>}
          <Text style={styles.content}>{item.content || item.note}</Text>
          {item.homework && (
            <View style={styles.hwBox}>
              <Text style={styles.hwLabel}>📚 Homework</Text>
              <Text style={styles.hwText}>{item.homework}</Text>
            </View>
          )}
          {item.teacherName && (
            <Text style={styles.teacher}>By {item.teacherName}</Text>
          )}
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No diary entries found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  datePill: { backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  dateText: { fontSize: 12, color: '#ea580c', fontWeight: '700' },
  subjectPill: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  subjectText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  content: { fontSize: 14, color: '#374151', lineHeight: 20 },
  hwBox: { backgroundColor: '#fefce8', borderRadius: 10, padding: 10, marginTop: 10 },
  hwLabel: { fontSize: 12, fontWeight: '700', color: '#ca8a04', marginBottom: 4 },
  hwText: { fontSize: 13, color: '#374151' },
  teacher: { fontSize: 12, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
