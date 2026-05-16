import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../services/api';

const CAT_COLORS = {
  GENERAL: '#64748b', ACADEMIC: '#2563eb', ANNOUNCEMENT: '#7c3aed',
  EXAM: '#d97706', FEE: '#059669', URGENT: '#dc2626',
};

export default function StudentMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/api/messages/student/inbox')
      .then(res => setMessages(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/api/messages/student/${id}/read`);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch { /* silent */ }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#c026d3" />;

  return (
    <FlatList
      style={styles.container}
      data={messages}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => {
        const catColor = CAT_COLORS[item.category] || '#64748b';
        return (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.unread]}
            onPress={() => !item.isRead && markRead(item.id)}
            activeOpacity={0.85}
          >
            <View style={styles.cardTop}>
              <View style={[styles.catBadge, { backgroundColor: catColor + '20' }]}>
                <Text style={[styles.catText, { color: catColor }]}>{item.category || 'GENERAL'}</Text>
              </View>
              {item.isImportant && <Text style={styles.importantTag}>⚡ Important</Text>}
              {!item.isRead && <View style={styles.unreadDot} />}
              <Text style={styles.date}>{item.createdAt?.slice(0, 10)}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
            {item.classSection && <Text style={styles.classSec}>📚 {item.classSection}</Text>}
            {!item.isRead && <Text style={styles.tapToRead}>Tap to mark as read</Text>}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No messages found.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  unread: { borderLeftWidth: 3, borderLeftColor: '#c026d3' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  catText: { fontSize: 11, fontWeight: '700' },
  importantTag: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c026d3' },
  date: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  content: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  classSec: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 6 },
  tapToRead: { fontSize: 11, color: '#c026d3', marginTop: 6, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
