import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const TILES = [
  { label: 'Students', icon: '🎓', screen: 'AdminStudents', color: '#ede9fe', accent: '#7c3aed' },
  { label: 'Attendance Report', icon: '📋', screen: 'AdminAttendanceReport', color: '#dbeafe', accent: '#2563eb' },
  { label: 'Leave Requests', icon: '🏖️', screen: 'AdminLeaveManagement', color: '#ffedd5', accent: '#ea580c' },
  { label: 'Collect Fee', icon: '💰', screen: 'AdminCollectFee', color: '#dcfce7', accent: '#16a34a' },
  { label: 'Messages', icon: '💬', screen: 'AdminMessages', color: '#fce7f3', accent: '#db2777' },
  { label: 'Admissions', icon: '📝', screen: 'AdminApplications', color: '#fef9c3', accent: '#ca8a04' },
  { label: 'Teacher Attendance', icon: '🧑‍🏫', screen: 'AdminTeacherAttendance', color: '#cffafe', accent: '#0891b2' },
];

export default function AdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: stats, loading, isOffline } = useCachedFetch('/api/admin/dashboard/stats');

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <OfflineBanner visible={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.name}>{user?.name || 'Admin'}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalStudents ?? '—'}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalTeachers ?? '—'}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalClasses ?? '—'}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.pendingApplications ?? '—'}</Text>
              <Text style={styles.statLabel}>Pending Apps</Text>
            </View>
          </View>
        )}
      </View>

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
  header: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: '#ddd6fe', fontSize: 13 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  date: { color: '#ddd6fe', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: { flexBasis: '47%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#ddd6fe', fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 24 },
  tile: { width: '29%', margin: '2%', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
