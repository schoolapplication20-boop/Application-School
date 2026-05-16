import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../../services/api';

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'LEAVE', 'LATE'];
const STATUS_COLORS = { PRESENT: '#dcfce7', ABSENT: '#fee2e2', LEAVE: '#fef9c3', LATE: '#ffedd5' };
const STATUS_TEXT = { PRESENT: '#166534', ABSENT: '#991b1b', LEAVE: '#854d0e', LATE: '#9a3412' };

export default function TeacherAttendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get('/api/teacher/classes')
      .then(res => {
        const list = res.data.data || [];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
      })
      .catch(() => Alert.alert('Error', 'Failed to load classes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/teacher/class/${selectedClass.id}/students`),
      api.get(`/api/teacher/attendance/${selectedClass.id}?date=${today}`),
    ]).then(([sRes, aRes]) => {
      const studentList = sRes.data.data || [];
      setStudents(studentList);
      const existing = aRes.data.data || [];
      const map = {};
      if (existing.length > 0) {
        setAlreadyMarked(true);
        existing.forEach(r => { map[r.studentId] = r.status; });
      } else {
        setAlreadyMarked(false);
        studentList.forEach(s => { map[s.id] = 'PRESENT'; });
      }
      setAttendanceMap(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedClass]);

  const toggle = (id) => {
    const statuses = STATUS_OPTIONS;
    const cur = attendanceMap[id] || 'PRESENT';
    const next = statuses[(statuses.indexOf(cur) + 1) % statuses.length];
    setAttendanceMap(prev => ({ ...prev, [id]: next }));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = students.map(s => ({
        studentId: s.id,
        classId: selectedClass.id,
        className: selectedClass.name + (selectedClass.section ? `-${selectedClass.section}` : ''),
        date: today,
        status: attendanceMap[s.id] || 'PRESENT',
      }));
      await api.post('/api/teacher/attendance', payload);
      Alert.alert('Success', 'Attendance marked successfully.');
      setAlreadyMarked(true);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && classes.length === 0) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#059669" />;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classRow}>
        {classes.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.classChip, selectedClass?.id === c.id && styles.classChipActive]}
            onPress={() => setSelectedClass(c)}
          >
            <Text style={[styles.classChipText, selectedClass?.id === c.id && styles.classChipTextActive]}>
              {c.name}{c.section ? `-${c.section}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.dateBar}>
        <Text style={styles.dateText}>📅 {today}</Text>
        {alreadyMarked && <View style={styles.markedBadge}><Text style={styles.markedText}>Already Marked</Text></View>}
      </View>

      {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#059669" /> : (
        <FlatList
          data={students}
          keyExtractor={s => s.id.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={styles.indexCircle}><Text style={styles.indexText}>{index + 1}</Text></View>
              <Text style={styles.studentName}>{item.name}</Text>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: STATUS_COLORS[attendanceMap[item.id]] || '#dcfce7' }]}
                onPress={() => toggle(item.id)}
              >
                <Text style={[styles.statusText, { color: STATUS_TEXT[attendanceMap[item.id]] || '#166534' }]}>
                  {attendanceMap[item.id] || 'PRESENT'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No students in this class.</Text>}
        />
      )}

      {students.length > 0 && (
        <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Attendance</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  classRow: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, maxHeight: 56 },
  classChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  classChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  classChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  classChipTextActive: { color: '#fff' },
  dateBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', marginTop: 1 },
  dateText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  markedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  markedText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, padding: 14, borderRadius: 12, elevation: 1 },
  indexCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  studentName: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  submitBtn: { backgroundColor: '#059669', margin: 12, borderRadius: 12, padding: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
