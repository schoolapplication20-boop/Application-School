import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const TILES = [
  { label: 'Admin Management', icon: '🧑‍💼', screen: 'AdminManagement', color: '#e0e7ff', accent: '#4338ca' },
  { label: 'Diary Monitoring', icon: '📔', screen: 'DiaryMonitoring', color: '#fce7f3', accent: '#db2777' },
  { label: 'Transport Dashboard', icon: '🚌', screen: 'TransportDashboard', color: '#cffafe', accent: '#0891b2' },
];

export default function SuperAdminDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const statsFetch = useCachedFetch('/api/admin/dashboard/stats');
  const adminsFetch = useCachedFetch('/api/superadmin/admins');
  const feeFetch = useCachedFetch('/api/admin/fee-summary');

  const stats = statsFetch.data;
  const admins = (adminsFetch.data || []).filter(a => !a.role || a.role === 'ADMIN');
  const fee = feeFetch.data;

  const loading = statsFetch.loading && adminsFetch.loading && feeFetch.loading;
  const isOffline = statsFetch.isOffline || adminsFetch.isOffline || feeFetch.isOffline;

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.isActive !== false).length;

  const grandTotal = fee?.grandTotal ?? 0;
  const grandPaid = fee?.grandPaid ?? 0;
  const grandPending = fee?.grandPending ?? 0;
  const collectedPct = grandTotal > 0 ? Math.min(100, Math.round((grandPaid / grandTotal) * 100)) : 0;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <OfflineBanner visible={isOffline} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.name}>{user?.name || 'Super Admin'}</Text>
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
              <Text style={styles.statVal}>{totalAdmins}</Text>
              <Text style={styles.statLabel}>Admins ({activeAdmins} active)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalTeachers ?? '—'}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalStudents ?? '—'}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{stats?.totalClasses ?? '—'}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
          </View>
        )}
      </View>

      {!loading && fee && (
        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>Fee Collection Overview</Text>
          <View style={styles.feeRow}>
            <View style={styles.feeItem}>
              <Text style={styles.feeVal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
              <Text style={styles.feeLabel}>Assigned</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={[styles.feeVal, { color: '#16a34a' }]}>₹{grandPaid.toLocaleString('en-IN')}</Text>
              <Text style={styles.feeLabel}>Collected</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={[styles.feeVal, { color: '#dc2626' }]}>₹{grandPending.toLocaleString('en-IN')}</Text>
              <Text style={styles.feeLabel}>Pending</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${collectedPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{collectedPct}% collected</Text>
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
  header: { backgroundColor: '#4338ca', paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: '#c7d2fe', fontSize: 13 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  date: { color: '#c7d2fe', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: { flexBasis: '47%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#c7d2fe', fontSize: 11, marginTop: 2, textAlign: 'center' },
  feeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 16, elevation: 1 },
  feeTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  feeItem: { alignItems: 'center', flex: 1 },
  feeVal: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  feeLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16a34a', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: '#64748b', marginTop: 6, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 24 },
  tile: { width: '29%', margin: '2%', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
