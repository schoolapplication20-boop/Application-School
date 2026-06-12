import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const STATUS_STYLE = {
  Active: { bg: '#dcfce7', text: '#166534' },
  Inactive: { bg: '#f1f5f9', text: '#64748b' },
  Maintenance: { bg: '#ffedd5', text: '#9a3412' },
};

export default function TransportDashboard() {
  const busesFetch = useCachedFetch('/api/transport/buses');
  const driversFetch = useCachedFetch('/api/transport/drivers');
  const routesFetch = useCachedFetch('/api/transport/routes');
  const stopsFetch = useCachedFetch('/api/transport/stops');
  const studentsFetch = useCachedFetch('/api/transport/students');

  const buses = busesFetch.data || [];
  const drivers = driversFetch.data || [];
  const routes = routesFetch.data || [];
  const stops = stopsFetch.data || [];
  const students = studentsFetch.data || [];

  const loading = busesFetch.loading && driversFetch.loading && routesFetch.loading && stopsFetch.loading && studentsFetch.loading;
  const isOffline = busesFetch.isOffline || driversFetch.isOffline || routesFetch.isOffline || stopsFetch.isOffline || studentsFetch.isOffline;

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4338ca" />;
  }

  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;
  const activeRoutes = routes.filter(r => r.status === 'Active').length;
  const totalCapacity = buses.reduce((sum, b) => sum + (b.capacity || 0), 0);
  const utilizationPct = totalCapacity > 0 ? Math.round((students.length / totalCapacity) * 100) : 0;

  const STATS = [
    { label: 'Buses', value: buses.length, sub: `${activeBuses} active` },
    { label: 'Drivers', value: drivers.length, sub: `${activeDrivers} active` },
    { label: 'Routes', value: routes.length, sub: `${activeRoutes} active` },
    { label: 'Stops', value: stops.length, sub: null },
    { label: 'Students', value: students.length, sub: `${utilizationPct}% capacity used` },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }}>
      <OfflineBanner visible={isOffline} />

      <View style={styles.statsGrid}>
        {STATS.map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            {s.sub ? <Text style={styles.statSub}>{s.sub}</Text> : null}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Fleet Utilization</Text>
      {buses.slice(0, 4).map(bus => {
        const s = STATUS_STYLE[bus.status] || STATUS_STYLE.Active;
        return (
          <View key={bus.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>🚌 {bus.busNo}</Text>
                <Text style={styles.subtext}>{bus.route}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{bus.status}</Text>
              </View>
            </View>
            <Text style={styles.subtext}>👥 {bus.currentStudents ?? 0} / {bus.capacity ?? 0} seats</Text>
          </View>
        );
      })}
      {buses.length === 0 && <Text style={styles.empty}>No buses found.</Text>}

      <Text style={styles.sectionTitle}>Routes Overview</Text>
      {routes.map(route => {
        const s = STATUS_STYLE[route.status] || STATUS_STYLE.Active;
        return (
          <View key={route.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>🛣️ {route.name}</Text>
                <Text style={styles.subtext}>🚌 {route.busNo} · 👤 {route.driverName}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.text }]}>{route.status}</Text>
              </View>
            </View>
            <Text style={styles.subtext}>📍 {route.stops} stops · {route.distance} · ⏰ {route.pickupTime}</Text>
          </View>
        );
      })}
      {routes.length === 0 && <Text style={styles.empty}>No routes found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: { flexBasis: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statSub: { fontSize: 10, color: '#4338ca', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  subtext: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 12, marginBottom: 12, fontSize: 14 },
});
