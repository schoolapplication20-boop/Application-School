import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useCachedFetch from '../../hooks/useCachedFetch';
import OfflineBanner from '../../components/OfflineBanner';

export default function TeacherDiary() {
  const { user } = useAuth();
  const { data: entriesData, loading: entriesLoading, isOffline: entriesOffline, reload: reloadEntries } = useCachedFetch('/api/diary/teacher');
  const { data: classesData, loading: classesLoading, isOffline: classesOffline } = useCachedFetch('/api/teacher/classes');
  const entries = entriesData || [];
  const classes = classesData || [];
  const loading = entriesLoading || classesLoading;
  const isOffline = entriesOffline || classesOffline;
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ classId: '', className: '', section: '', subject: '', topic: '', homework: '', description: '', remarks: '', diaryDate: new Date().toISOString().slice(0, 10) });

  const submit = async () => {
    if (!form.topic.trim()) { Alert.alert('Error', 'Topic is required.'); return; }
    if (!form.homework.trim()) { Alert.alert('Error', 'Homework is required.'); return; }
    if (!form.classId) { Alert.alert('Error', 'Please select a class.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/diary/create', {
        classId: `id:${form.classId}`,
        className: form.className,
        section: form.section,
        subject: form.subject,
        topic: form.topic,
        homework: form.homework,
        description: form.description,
        remarks: form.remarks,
        diaryDate: form.diaryDate,
        teacherId: user?.id,
        teacherName: user?.name,
      });
      Alert.alert('Success', 'Diary entry created.');
      setModalVisible(false);
      setForm({ classId: '', className: '', section: '', subject: '', topic: '', homework: '', description: '', remarks: '', diaryDate: new Date().toISOString().slice(0, 10) });
      reloadEntries();
    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to create diary entry.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#8b5cf6" />;

  return (
    <View style={styles.container}>
      <OfflineBanner visible={isOffline} />
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Diary Entry</Text>
      </TouchableOpacity>

      <FlatList
        data={entries}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardDate}>{item.diaryDate}</Text>
              <Text style={styles.cardClass}>{item.className}{item.section ? `-${item.section}` : ''}</Text>
            </View>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardTopic}>📖 Topic: {item.topic}</Text>
            {item.homework && <Text style={styles.cardHW}>📚 Homework: {item.homework}</Text>}
            {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No diary entries yet.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Diary Entry</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Select Class *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.classChip, form.classId === c.id?.toString() && styles.classChipActive]}
                    onPress={() => setForm(f => ({ ...f, classId: c.id?.toString(), className: c.name, section: c.section || '' }))}
                  >
                    <Text style={[styles.chipText, form.classId === c.id?.toString() && styles.chipTextActive]}>
                      {c.name}{c.section ? `-${c.section}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {[
                { key: 'subject', label: 'Subject *', placeholder: 'e.g. Mathematics' },
                { key: 'diaryDate', label: 'Date *', placeholder: 'YYYY-MM-DD' },
                { key: 'topic', label: 'Topic *', placeholder: 'Today\'s topic' },
                { key: 'homework', label: 'Homework *', placeholder: 'Homework given' },
                { key: 'description', label: 'Description', placeholder: 'Additional notes' },
                { key: 'remarks', label: 'Remarks', placeholder: 'Any remarks' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, (field.key === 'description' || field.key === 'remarks') && { height: 70 }]}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                    multiline={field.key === 'description' || field.key === 'remarks'}
                  />
                </View>
              ))}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
                  <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save'}</Text>
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
  addBtn: { backgroundColor: '#8b5cf6', margin: 12, borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardDate: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardClass: { fontSize: 12, color: '#8b5cf6', fontWeight: '700' },
  cardSubject: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginBottom: 6 },
  cardTopic: { fontSize: 14, color: '#1e293b', marginBottom: 4 },
  cardHW: { fontSize: 13, color: '#d97706', fontWeight: '500', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748b' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#f8fafc' },
  classChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc' },
  classChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: '#8b5cf6', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#fff' },
});
