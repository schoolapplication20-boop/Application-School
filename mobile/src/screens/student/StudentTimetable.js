import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable() {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday');

  const { data, loading, isOffline } = useCachedFetch('/api/timetable', { studentId: user?.id });
  const timetable = data || [];

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  const filtered = timetable.filter(t => t.day === activeDay || t.dayOfWeek === activeDay);

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
        {DAYS.map(d => (
          <Text
            key={d}
            onPress={() => setActiveDay(d)}
            style={[styles.dayChip, activeDay === d && styles.dayChipActive]}
          >
            {d.slice(0, 3)}
          </Text>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.timeCol}>
              <Text style={styles.time}>{item.startTime}</Text>
              <View style={styles.timeDot} />
              <Text style={styles.time}>{item.endTime}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.subject}>{item.subject || item.subjectName}</Text>
              <Text style={styles.teacher}>{item.teacherName}</Text>
              {item.room && <Text style={styles.room}>🏫 Room {item.room}</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No classes on {activeDay}.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  dayRow: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, maxHeight: 56 },
  dayChip: { paddingHorizontal: 18, paddingVertical: 7, marginRight: 8, borderRadius: 20, fontSize: 13, color: '#64748b', fontWeight: '600', backgroundColor: '#f1f5f9' },
  dayChipActive: { backgroundColor: '#2563eb', color: '#fff' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  timeCol: { alignItems: 'center', marginRight: 16, minWidth: 60 },
  time: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  timeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb', marginVertical: 4 },
  info: { flex: 1 },
  subject: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  teacher: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  room: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
