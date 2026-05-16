import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { scale, fontScale, tileWidth } from '../../utils/responsive';

const tiles = [
  { label: 'Attendance', icon: '📋', screen: 'TeacherAttendance', color: '#3b82f6' },
  { label: 'Diary', icon: '📓', screen: 'TeacherDiary', color: '#8b5cf6' },
  { label: 'Assignments', icon: '📝', screen: 'TeacherAssignments', color: '#f59e0b' },
  { label: 'Marks', icon: '📊', screen: 'TeacherMarks', color: '#10b981' },
  { label: 'Schedule', icon: '🗓️', screen: 'TeacherSchedule', color: '#6366f1' },
  { label: 'Messages', icon: '💬', screen: 'TeacherMessages', color: '#ec4899' },
  { label: 'Leave', icon: '🏖️', screen: 'TeacherLeave', color: '#f97316' },
  { label: 'Exams', icon: '🎯', screen: 'TeacherExams', color: '#14b8a6' },
  { label: 'Approve Leave', icon: '✅', screen: 'TeacherLeaveApproval', color: '#84cc16' },
];

export default function TeacherDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/teacher/profile'),
      api.get('/api/teacher/class-teacher-assignment'),
    ]).then(([pRes, cRes]) => {
      setProfile(pRes.data.data);
      setClassInfo(cRes.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + scale(16) }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.name}>{user?.name || 'Teacher'}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoVal}>{profile?.subject || '—'}</Text>
              <Text style={styles.infoLabel}>Subject</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoVal}>{classInfo?.label || '—'}</Text>
              <Text style={styles.infoLabel}>Class</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoVal}>{profile?.teacherType === 'CLASS_TEACHER' || profile?.teacherType === 'BOTH' ? 'Yes' : 'No'}</Text>
              <Text style={styles.infoLabel}>Class Teacher</Text>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Modules</Text>
      <View style={styles.grid}>
        {tiles.map(tile => (
          <TouchableOpacity
            key={tile.screen}
            style={[styles.tile, { borderTopColor: tile.color }]}
            onPress={() => navigation.navigate(tile.screen)}
          >
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#059669', paddingHorizontal: scale(20), paddingBottom: scale(24) },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: '#a7f3d0', fontSize: fontScale(13) },
  name: { color: '#fff', fontSize: fontScale(21), fontWeight: '800', marginTop: 2 },
  date: { color: '#a7f3d0', fontSize: fontScale(12), marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: fontScale(12), fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: scale(10), marginTop: scale(16) },
  infoCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: scale(12), alignItems: 'center' },
  infoVal: { color: '#fff', fontSize: fontScale(13), fontWeight: '700' },
  infoLabel: { color: '#a7f3d0', fontSize: fontScale(11), marginTop: 2 },
  sectionTitle: { fontSize: fontScale(15), fontWeight: '700', color: '#1e293b', marginHorizontal: scale(16), marginTop: scale(20), marginBottom: scale(12) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: scale(10), paddingBottom: scale(24) },
  tile: { width: tileWidth, backgroundColor: '#fff', margin: '2%', borderRadius: scale(14), padding: scale(14), alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, borderTopWidth: 3 },
  tileIcon: { fontSize: fontScale(26), marginBottom: 8 },
  tileLabel: { fontSize: fontScale(11), fontWeight: '600', color: '#374151', textAlign: 'center' },
});
