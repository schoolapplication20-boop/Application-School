import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TILES = [
  { label: 'Attendance', icon: '📋', screen: 'StudentAttendance', color: '#eff6ff', accent: '#2563eb' },
  { label: 'Schedule', icon: '🗓️', screen: 'StudentTimetable', color: '#f0fdf4', accent: '#16a34a' },
  { label: 'Assignments', icon: '📝', screen: 'StudentAssignments', color: '#fef3c7', accent: '#d97706' },
  { label: 'Exams', icon: '📊', screen: 'StudentExams', color: '#fdf2f8', accent: '#9333ea' },
  { label: 'Fees', icon: '💳', screen: 'StudentFees', color: '#ecfdf5', accent: '#059669' },
  { label: 'Diary', icon: '📓', screen: 'StudentDiary', color: '#fff7ed', accent: '#ea580c' },
  { label: 'Messages', icon: '💬', screen: 'StudentMessages', color: '#fdf4ff', accent: '#c026d3' },
  { label: 'Leave', icon: '🏖️', screen: 'StudentLeave', color: '#f0f9ff', accent: '#0284c7' },
  { label: 'My Marks', icon: '🎯', screen: 'StudentMarks', color: '#fefce8', accent: '#ca8a04' },
];

export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ attendance: null, pendingFees: 0 });

  useEffect(() => {
    api.get('/api/student/me')
      .then(res => setProfile(res.data.data || res.data))
      .catch(() => {});

    const today = new Date().toISOString().split('T')[0];
    const start = `${new Date().getFullYear()}-01-01`;
    api.get('/api/student/attendance', { params: { startDate: start, endDate: today } })
      .then(res => {
        const records = res.data.data || [];
        const present = records.filter(r => r.status === 'PRESENT').length;
        const pct = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
        setStats(s => ({ ...s, attendance: pct }));
      })
      .catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, 👋</Text>
          <Text style={styles.name}>{user?.name || 'Student'}</Text>
          {profile?.className && (
            <Text style={styles.classInfo}>Class {profile.className}{profile.section ? `-${profile.section}` : ''}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {stats.attendance !== null && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.attendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          {profile?.rollNumber && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.rollNumber}</Text>
              <Text style={styles.statLabel}>Roll No</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.grid}>
        {TILES.map(tile => (
          <TouchableOpacity
            key={tile.screen}
            style={[styles.tile, { backgroundColor: tile.color }]}
            onPress={() => navigation.navigate(tile.screen)}
          >
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={[styles.tileLabel, { color: tile.accent }]}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  greeting: { color: '#bfdbfe', fontSize: 13 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  classInfo: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', margin: 12, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 14, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 20 },
  tile: { width: '29%', margin: '2%', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 1 },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
