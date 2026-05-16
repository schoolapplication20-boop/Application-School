import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import api from '../../services/api';

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', classSection: '', dueDate: '', maxMarks: '100' });

  const load = () => {
    api.get('/api/teacher/assignments')
      .then(res => setAssignments(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required.'); return; }
    if (!form.classSection.trim()) { Alert.alert('Error', 'Class section is required.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/teacher/assignments', {
        title: form.title,
        description: form.description,
        classSection: form.classSection,
        dueDate: form.dueDate || null,
        maxMarks: parseFloat(form.maxMarks) || 100,
        status: 'Active',
      });
      Alert.alert('Success', 'Assignment posted.');
      setModalVisible(false);
      setForm({ title: '', description: '', classSection: '', dueDate: '', maxMarks: '100' });
      load();
    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to post assignment.'); }
    finally { setSubmitting(false); }
  };

  const remove = (id) => {
    Alert.alert('Delete', 'Delete this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/teacher/assignments/${id}`);
            load();
          } catch { Alert.alert('Error', 'Failed to delete.'); }
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#8b5cf6" />;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Post Assignment</Text>
      </TouchableOpacity>

      <FlatList
        data={assignments}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.classSection}>📚 {item.classSection}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <View style={styles.row}>
              {item.dueDate && <Text style={styles.due}>📅 Due: {item.dueDate}</Text>}
              {item.maxMarks && <Text style={styles.marks}>Max: {item.maxMarks}</Text>}
            </View>
            <View style={[styles.statusBadge, item.status === 'Active' ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{item.status || 'Active'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No assignments posted yet.</Text>}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Post Assignment</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} placeholder="Assignment title" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80 }]} placeholder="Description (optional)" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
              <Text style={styles.label}>Class Section *</Text>
              <TextInput style={styles.input} placeholder="e.g. 10-A" value={form.classSection} onChangeText={v => setForm(f => ({ ...f, classSection: v }))} />
              <Text style={styles.label}>Due Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={form.dueDate} onChangeText={v => setForm(f => ({ ...f, dueDate: v }))} />
              <Text style={styles.label}>Max Marks</Text>
              <TextInput style={styles.input} placeholder="100" value={form.maxMarks} onChangeText={v => setForm(f => ({ ...f, maxMarks: v }))} keyboardType="numeric" />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
                  <Text style={styles.saveText}>{submitting ? 'Posting...' : 'Post'}</Text>
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  classSection: { fontSize: 12, color: '#8b5cf6', fontWeight: '600' },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 16, color: '#94a3b8' },
  desc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  due: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  marks: { fontSize: 12, color: '#64748b' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  activeBadge: { backgroundColor: '#dcfce7' },
  inactiveBadge: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12, backgroundColor: '#f8fafc' },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveBtn: { flex: 1, backgroundColor: '#8b5cf6', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#fff' },
});
