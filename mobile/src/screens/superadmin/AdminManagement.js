import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

export default function AdminManagement() {
  const { data, loading, isOffline } = useCachedFetch('/api/superadmin/admins');
  const [admins, setAdmins] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (data) setAdmins(data.filter(a => !a.role || a.role === 'ADMIN'));
  }, [data]);

  const toggleActive = (admin) => {
    const next = !(admin.isActive !== false);
    Alert.alert(
      next ? 'Reactivate Admin' : 'Deactivate Admin',
      next
        ? `Reactivate ${admin.name}? They will regain access.`
        : `Deactivate ${admin.name}? They will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Reactivate' : 'Deactivate',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            setActionLoading(admin.id);
            try {
              await api.put(`/api/superadmin/admins/${admin.id}`, { isActive: next });
              setAdmins(prev => prev.map(a => (a.id === admin.id ? { ...a, isActive: next } : a)));
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to update admin.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  if (loading && admins.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4338ca" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={admins}
        keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={<OfflineBanner visible={isOffline} />}
        renderItem={({ item }) => {
          const active = item.isActive !== false;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  {item.mobile ? <Text style={styles.mobile}>📞 {item.mobile}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.badge, { backgroundColor: active ? '#dcfce7' : '#f1f5f9' }, actionLoading === item.id && { opacity: 0.6 }]}
                  onPress={() => toggleActive(item)}
                  disabled={actionLoading === item.id}
                >
                  <Text style={[styles.badgeText, { color: active ? '#166534' : '#64748b' }]}>
                    {active ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
              {item.createdAt ? <Text style={styles.createdAt}>Joined {item.createdAt.slice(0, 10)}</Text> : null}
              {item.tempPassword ? (
                <Text style={styles.tempPassword}>🔑 Temp password: {item.tempPassword} — share with this admin</Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No admins found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#4338ca' },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  mobile: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  createdAt: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  tempPassword: { fontSize: 12, color: '#b45309', marginTop: 6, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
