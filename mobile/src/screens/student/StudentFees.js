import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const STATUS_STYLE = {
  PAID:    { bg: '#dcfce7', text: '#166534' },
  PENDING: { bg: '#fef9c3', text: '#854d0e' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
};

export default function StudentFees() {
  const { data, loading, isOffline } = useCachedFetch('/api/student/fees');
  const fees = data || [];

  const totalPaid = fees.filter(f => f.status === 'PAID').reduce((sum, f) => sum + (f.amount || 0), 0);
  const totalPending = fees.filter(f => f.status !== 'PAID').reduce((sum, f) => sum + (f.amount || 0), 0);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#059669" />;

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.summaryAmount}>₹{totalPaid.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: '#166534' }]}>Paid</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef9c3' }]}>
          <Text style={styles.summaryAmount}>₹{totalPending.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: '#854d0e' }]}>Pending</Text>
        </View>
      </View>

      <FlatList
        data={fees}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const s = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.feeName}>{item.feeName || item.feeType || 'Fee'}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.text }]}>{item.status || 'PENDING'}</Text>
                </View>
              </View>
              <Text style={styles.amount}>₹ {(item.amount || 0).toLocaleString()}</Text>
              {item.dueDate && <Text style={styles.dueDate}>📅 Due: {item.dueDate}</Text>}
              {item.paidDate && <Text style={styles.paidDate}>✅ Paid on: {item.paidDate}</Text>}
              {item.description && <Text style={styles.description}>{item.description}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No fee records found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  summaryRow: { flexDirection: 'row', margin: 12, gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryAmount: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  summaryLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feeName: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 22, fontWeight: '800', color: '#059669', marginBottom: 6 },
  dueDate: { fontSize: 12, color: '#ef4444', fontWeight: '600', marginBottom: 2 },
  paidDate: { fontSize: 12, color: '#16a34a', marginBottom: 2 },
  description: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
