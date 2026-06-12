import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import api from '../../services/api';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

const CATEGORIES = ['GENERAL', 'ACADEMIC', 'ANNOUNCEMENT', 'EXAM', 'FEE', 'URGENT'];
const CAT_COLORS = { GENERAL: '#64748b', ACADEMIC: '#2563eb', ANNOUNCEMENT: '#7c3aed', EXAM: '#d97706', FEE: '#059669', URGENT: '#dc2626' };

export default function TeacherMessages() {
  const { data, loading, isOffline, reload } = useCachedFetch('/api/messages/broadcasts');
  const messages = data || [];
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'GENERAL', classSection: '', isImportant: false });

  const send = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required.'); return; }
    if (!form.content.trim()) { Alert.alert('Error', 'Message content is required.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/messages/broadcast', {
        title: form.title,
        content: form.content,
        category: form.category,
        classSection: form.classSection,
        isSchoolWide: !form.classSection,
        isImportant: form.isImportant,
      });
      Alert.alert('Success', 'Message sent.');
      setModalVisible(false);
      setForm({ title: '', content: '', category: 'GENERAL', classSection: '', isImportant: false });
      reload();
    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to send message.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#ec4899" />;

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <TouchableOpacity style={styles.sendBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.sendBtnText}>+ Send Message</Text>
      </TouchableOpacity>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[item.category] || '#64748b') + '20' }]}>
                <Text style={[styles.catText, { color: CAT_COLORS[item.category] || '#64748b' }]}>{item.category}</Text>
              </View>
              {item.isImportant && <Text style={styles.importantTag}>⚡ Important</Text>}
              <Text style={styles.dateText}>{item.createdAt?.slice(0, 10)}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
            {item.classSection && <Text style={styles.classSec}>📚 {item.classSection}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages sent yet.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Send Message</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.catChip, form.category === c && { backgroundColor: CAT_COLORS[c], borderColor: CAT_COLORS[c] }]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                    <Text style={[styles.catChipText, form.category === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="Message title" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />
              <Text style={styles.label}>Message *</Text>
              <TextInput style={[styles.input, { height: 100 }]} placeholder="Write your message..." value={form.content} onChangeText={v => setForm(f => ({ ...f, content: v }))} multiline />
              <Text style={styles.label}>Class Section (leave blank for school-wide)</Text>
              <TextInput style={styles.input} placeholder="e.g. 10-A" value={form.classSection} onChangeText={v => setForm(f => ({ ...f, classSection: v }))} />
              <TouchableOpacity style={styles.importantRow} onPress={() => setForm(f => ({ ...f, isImportant: !f.isImportant }))}>
                <View style={[styles.checkbox, form.isImportant && styles.checkboxChecked]}>
                  {form.isImportant && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.importantLabel}>Mark as Important</Text>
              </TouchableOpacity>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={send} disabled={submitting}>
                  <Text style={styles.saveText}>{submitting ? 'Sending...' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  sendBtn: { backgroundColor: '#ec4899', margin: 12, borderRadius: 12, padding: 14, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  catText: { fontSize: 11, fontWeight: '700' },
  importantTag: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  dateText: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  content: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  classSec: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#f8fafc' },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc' },
  catChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  importantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 13 },
  importantLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: '#ec4899', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#fff' },
});
