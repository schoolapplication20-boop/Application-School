import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

export default function AdminStudents() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [students, setStudents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, isOffline } = useCachedFetch('/api/admin/students', { search: debouncedSearch, page, size: 20 });

  useEffect(() => {
    if (!data) return;
    setStudents(prev => (page === 0 ? (data.content || []) : [...prev, ...(data.content || [])]));
  }, [data]);

  const loadMore = () => {
    if (data && !data.last && !loading) setPage(p => p + 1);
  };

  if (loading && page === 0 && students.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={students}
        keyExtractor={s => s.id.toString()}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={
          <>
            <OfflineBanner visible={isOffline} />
            <TextInput
              style={styles.search}
              placeholder="Search by name, roll no, admission no..."
              value={search}
              onChangeText={setSearch}
            />
          </>
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setExpandedId(expanded ? null : item.id)}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>Class {item.className}{item.section ? `-${item.section}` : ''} · Roll {item.rollNumber || '—'}</Text>
                </View>
              </View>
              <Text style={styles.contact}>👨‍👩‍👧 {item.parentName || '—'} · 📞 {item.parentMobile || '—'}</Text>
              {expanded && (
                <View style={styles.detail}>
                  <Text style={styles.detailRow}>Admission No: {item.admissionNumber || '—'}</Text>
                  <Text style={styles.detailRow}>DOB: {item.dateOfBirth || '—'}</Text>
                  <Text style={styles.detailRow}>Blood Group: {item.bloodGroup || '—'}</Text>
                  <Text style={styles.detailRow}>Address: {item.address || '—'}</Text>
                  <Text style={styles.detailRow}>Mother: {item.motherName || '—'} · 📞 {item.motherMobile || '—'}</Text>
                  <Text style={styles.detailRow}>Guardian: {item.guardianName || '—'} · 📞 {item.guardianMobile || '—'}</Text>
                  <Text style={styles.detailRow}>Status: {item.isActive ? 'Active' : 'Inactive'}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          loading && page > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color="#7c3aed" /> :
          (data && !data.last) ? (
            <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No students found.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  search: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  contact: { fontSize: 12, color: '#374151' },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailRow: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  loadMore: { backgroundColor: '#ede9fe', borderRadius: 10, padding: 12, alignItems: 'center', marginVertical: 12 },
  loadMoreText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
