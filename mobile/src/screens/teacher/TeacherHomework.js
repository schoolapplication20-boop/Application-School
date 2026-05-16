import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';

export default function TeacherHomework() {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    api.get('/api/teacher/homework')
      .then(res => setHomework(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const submit = async () => {
    if (!title || !dueDate) { Alert.alert('Error', 'Title and due date are required.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/teacher/homework', { title, description, dueDate });
      Alert.alert('Success', 'Homework posted.');
      setTitle(''); setDescription(''); setDueDate('');
      fetch();
    } catch { Alert.alert('Error', 'Failed to post homework.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#059669" />;

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Post Homework</Text>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, { height: 70 }]} placeholder="Description" value={description} onChangeText={setDescription} multiline />
        <TextInput style={styles.input} placeholder="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
        <TouchableOpacity style={styles.btn} onPress={submit} disabled={submitting}>
          <Text style={styles.btnText}>{submitting ? 'Posting...' : 'Post Homework'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={homework}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <Text style={styles.due}>Due: {item.dueDate}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No homework yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  form: { backgroundColor: '#fff', margin: 12, borderRadius: 14, padding: 16 },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
  btn: { backgroundColor: '#059669', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14 },
  title: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  desc: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  due: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 20 },
});
