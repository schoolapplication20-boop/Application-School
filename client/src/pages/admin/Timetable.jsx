import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { classOrder } from '../../utils/classOrder';
import { useToast } from '../../context/ToastContext';
import {
  fetchTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  checkOverlap,
  formatTime,
} from '../../services/timetableService';
import { fetchTeachers } from '../../services/teacherService';
import { adminAPI } from '../../services/api';
import { DAYS, EMPTY_FORM } from './timetable/constants';
import ScheduleTable from './timetable/ScheduleTable';
import EntryModal from './timetable/EntryModal';
import DeleteConfirmModal from './timetable/DeleteConfirmModal';
import BulkAssignModal from './timetable/BulkAssignModal';

export default function Timetable() {
  const [entries, setEntries]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Modals
  const [showForm, setShowForm]         = useState(false);
  const [showBulk, setShowBulk]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Expanded teachers in grouped view
  const [expandedTeachers, setExpandedTeachers] = useState(new Set());
  const toggleTeacher = (teacherId) => {
    setExpandedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  };

  // Single-entry form state
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const showToast = useToast();

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [tt, tc, cls] = await Promise.all([
        fetchTimetable(),
        fetchTeachers(),
        adminAPI.getClasses(),
      ]);
      setEntries(tt);
      setTeachers(tc.filter(t => t.status !== 'Inactive'));
      const raw = cls?.data?.data ?? cls?.data ?? cls ?? [];
      const formatted = raw
        .filter(c => c.isActive !== false)
        .sort((a, b) => {
          const d = classOrder(a.name) - classOrder(b.name);
          return d !== 0 ? d : (a.section || '').localeCompare(b.section || '');
        })
        .map(c => c.section ? `${c.name}-${c.section}` : c.name);
      setClasses([...new Set(formatted)]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Grouped view by teacher ──────────────────────────────────────────────────
  const groupedByTeacher = (() => {
    const map = new Map();
    for (const entry of entries) {
      const key = String(entry.teacherId);
      if (!map.has(key)) map.set(key, { teacherId: key, teacherName: entry.teacherName, rows: [] });
      map.get(key).rows.push(entry);
    }
    // Sort each teacher's rows by day then time
    for (const group of map.values()) {
      group.rows.sort((a, b) => {
        const dA = DAYS.indexOf(a.day), dB = DAYS.indexOf(b.day);
        if (dA !== dB) return dA - dB;
        return a.startTime.localeCompare(b.startTime);
      });
    }
    return [...map.values()].sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || ''));
  })();

  // ── Single-entry form helpers ─────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setForm({
      teacherId:    String(entry.teacherId),
      classSection: entry.classSection,
      subject:      entry.subject,
      days:         [entry.day],
      startTime:    entry.startTime,
      endTime:      entry.endTime,
    });
    setErrors({});
    setEditId(entry.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleDay = (day) => {
    setForm(prev => {
      const next = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      return { ...prev, days: next };
    });
    setErrors(prev => ({ ...prev, days: '' }));
  };

  // ── Single-entry validation ───────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.teacherId)              e.teacherId    = 'Select a teacher';
    if (!form.classSection)           e.classSection = 'Select a class';
    if (!form.subject.trim())         e.subject      = 'Enter a subject';
    if (form.days.length === 0)       e.days         = 'Select at least one day';
    if (!form.startTime)              e.startTime    = 'Enter start time';
    if (!form.endTime)                e.endTime      = 'Enter end time';
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'End time must be after start time';
    return e;
  };

  // ── Single-entry save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const teacher = teachers.find(
      t => String(t.id) === form.teacherId || String(t.userId) === form.teacherId,
    );
    const subjectTrimmed = form.subject.trim();
    const daysToSave = editId ? [form.days[0]] : form.days;

    for (const day of daysToSave) {
      const candidate = {
        teacherId:    Number(form.teacherId),
        classSection: form.classSection,
        subject:      subjectTrimmed,
        day,
        startTime:    form.startTime,
        endTime:      form.endTime,
        teacherName:  teacher?.name || '',
      };
      const conflict = checkOverlap(candidate, entries, editId);
      if (conflict) {
        setErrors({
          startTime: `${day}: Overlaps with ${conflict.subject} (${conflict.classSection}) ${formatTime(conflict.startTime)}–${formatTime(conflict.endTime)}`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (editId) {
        const candidate = {
          teacherId:    Number(form.teacherId),
          classSection: form.classSection,
          subject:      subjectTrimmed,
          day:          daysToSave[0],
          startTime:    form.startTime,
          endTime:      form.endTime,
          teacherName:  teacher?.name || '',
        };
        const updated = await updateTimetableEntry(editId, candidate);
        setEntries(prev => prev.map(en => en.id === editId ? updated : en));
        showToast('Timetable entry updated');
      } else {
        const created = await Promise.all(
          daysToSave.map(day => createTimetableEntry({
            teacherId:    Number(form.teacherId),
            classSection: form.classSection,
            subject:      subjectTrimmed,
            day,
            startTime:    form.startTime,
            endTime:      form.endTime,
            teacherName:  teacher?.name || '',
          })),
        );
        setEntries(prev => [...prev, ...created]);
        showToast(
          daysToSave.length > 1
            ? `${daysToSave.length} entries added (${daysToSave.join(', ')})`
            : 'Timetable entry added',
        );
      }
      closeForm();
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteTimetableEntry(deleteTarget.id);
      if (result.success) {
        setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast('Entry deleted');
      } else {
        showToast(result.message || 'Failed to delete entry', 'error');
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Network error — entry not deleted', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Bulk save callback ────────────────────────────────────────────────────────
  const handleBulkSaved = (newEntries) => {
    setEntries(prev => [...prev, ...newEntries]);
    showToast(`${newEntries.length} entr${newEntries.length === 1 ? 'y' : 'ies'} added via Bulk Assign`);
  };

  const teacherOptions = teachers.map(t => ({
    value: String(t.userId || t.id),
    label: t.name,
  }));

  return (
    <Layout pageTitle="Timetable Management">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Timetable Management</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Assign class schedules and time slots to teachers</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowBulk(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>dashboard_customize</span>
            Bulk Assign
          </button>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>add</span>
            Add Schedule
          </button>
        </div>
      </div>

      {/* Schedule List */}
      <ScheduleTable
        loading={loading}
        entries={entries}
        groupedByTeacher={groupedByTeacher}
        expandedTeachers={expandedTeachers}
        onToggleTeacher={toggleTeacher}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onBulkAssign={() => setShowBulk(true)}
        onAddSchedule={openAdd}
      />

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <EntryModal
          editId={editId}
          form={form}
          errors={errors}
          saving={saving}
          classes={classes}
          teacherOptions={teacherOptions}
          set={set}
          toggleDay={toggleDay}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}

      {/* ─── Bulk Assign Modal ─────────────────────────────────────────────────── */}
      {showBulk && (
        <BulkAssignModal
          teachers={teachers}
          classes={classes}
          entries={entries}
          onSave={handleBulkSaved}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* ─── Delete Confirm Modal ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirmModal
          deleteTarget={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </Layout>
  );
}
