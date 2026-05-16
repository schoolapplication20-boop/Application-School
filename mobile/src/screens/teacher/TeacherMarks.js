import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam', 'Annual Exam'];

const getGrade = (marks, maxMarks) => {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'B-';
  if (pct >= 33) return 'C';
  return 'F';
};

const gradeColor = (g) => ({ O: '#059669', 'A+': '#2563eb', A: '#7c3aed', 'B+': '#d97706', B: '#f59e0b', 'B-': '#ea580c', C: '#dc2626', F: '#991b1b' }[g] || '#64748b');

export default function TeacherMarks() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [form, setForm] = useState({ subject: '', examType: 'Unit Test 1', marks: '', maxMarks: '100', examDate: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then(res => {
        const list = res.data.data || [];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    api.get(`/api/teacher/class/${selectedClass.id}/students`)
      .then(res => setStudents(res.data.data || []))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const openStudent = async (student) => {
    setSelectedStudent(student);
    setModalVisible(true);
    setMarksLoading(true);
    try {
      const res = await api.get(`/api/teacher/marks/${student.id}`);
      setStudentMarks(res.data.data || []);
    } catch { setStudentMarks([]); }
    finally { setMarksLoading(false); }
  };

  const submit = async () => {
    if (!form.subject.trim()) { Alert.alert('Error', 'Subject is required.'); return; }
    if (!form.marks) { Alert.alert('Error', 'Marks are required.'); return; }
    const marksNum = parseFloat(form.marks);
    const maxNum = parseFloat(form.maxMarks);
    if (isNaN(marksNum) || isNaN(maxNum) || marksNum > maxNum) {
      Alert.alert('Error', 'Invalid marks. Marks cannot exceed max marks.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/teacher/marks', {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        subject: form.subject,
        examType: form.examType,
        marks: marksNum,
        maxMarks: maxNum,
        grade: getGrade(marksNum, maxNum),
        teacherId: user?.id,
        examDate: form.examDate,
      });
      Alert.alert('Success', 'Marks saved.');
      const res = await api.get(`/api/teacher/marks/${selectedStudent.id}`);
      setStudentMarks(res.data.data || []);
      setForm({ subject: '', examType: 'Unit Test 1', marks: '', maxMarks: '100', examDate: new Date().toISOString().slice(0, 10) });
    } catch (err) { Alert.alert('Error', err?.response?.data?.message || 'Failed to save marks.'); }
    finally { setSubmitting(false); }
  };

  if (loading && classes.length === 0) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#10b981" />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classRow}>
        {classes.map(c => (
          <TouchableOpacity key={c.id} style={[styles.classChip, selectedClass?.id === c.id && styles.classChipActive]} onPress={() => setSelectedClass(c)}>
            <Text style={[styles.chipText, selectedClass?.id === c.id && styles.chipTextActive]}>{c.name}{c.section ? `-${c.section}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#10b981" /> : (
        <FlatList
          data={students}
          keyExtractor={s => s.id.toString()}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.studentCard} onPress={() => openStudent(item)}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]}</Text></View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.rollNo}>Roll No: {item.rollNumber || index + 1}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No students in this class.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedStudent?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionLabel}>Add Marks</Text>
              <TextInput style={styles.input} placeholder="Subject" value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {EXAM_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.examChip, form.examType === t && styles.examChipActive]} onPress={() => setForm(f => ({ ...f, examType: t }))}>
                    <Text style={[styles.examChipText, form.examType === t && styles.examChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.marksRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marks" value={form.marks} onChangeText={v => setForm(f => ({ ...f, marks: v }))} keyboardType="numeric" />
                <Text style={styles.slash}>/</Text>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max" value={form.maxMarks} onChangeText={v => setForm(f => ({ ...f, maxMarks: v }))} keyboardType="numeric" />
              </View>
              <TextInput style={styles.input} placeholder="Exam Date (YYYY-MM-DD)" value={form.examDate} onChangeText={v => setForm(f => ({ ...f, examDate: v }))} />
              <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
                <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Marks'}</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Previous Marks</Text>
              {marksLoading ? <ActivityIndicator color="#10b981" /> : studentMarks.length === 0 ? (
                <Text style={styles.empty}>No marks recorded yet.</Text>
              ) : studentMarks.map((m, i) => (
                <View key={i} style={styles.markRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.markSubject}>{m.subject}</Text>
                    <Text style={styles.markExam}>{m.examType} · {m.examDate}</Text>
                  </View>
                  <Text style={styles.markScore}>{m.marks}/{m.maxMarks}</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor(m.grade) + '20' }]}>
                    <Text style={[styles.gradeText, { color: gradeColor(m.grade) }]}>{m.grade}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  classRow: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, maxHeight: 56 },
  classChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  classChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#059669' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  rollNo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  arrow: { fontSize: 20, color: '#94a3b8' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  closeBtn: { fontSize: 18, color: '#94a3b8', padding: 4 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  input: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 10, backgroundColor: '#f8fafc' },
  examChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#f8fafc' },
  examChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  examChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  examChipTextActive: { color: '#fff' },
  marksRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slash: { fontSize: 18, color: '#94a3b8', fontWeight: '700' },
  saveBtn: { backgroundColor: '#10b981', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 8 },
  saveText: { color: '#fff', fontWeight: '700' },
  markRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8 },
  markSubject: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  markExam: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  markScore: { fontSize: 14, fontWeight: '700', color: '#374151', marginRight: 8 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 13, fontWeight: '800' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 20, fontSize: 13 },
});
