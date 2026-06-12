import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../components/Button';
import { adminAPI } from '../../../services/api';
import { formatClassName } from '../../../utils/format';
import { assignStudent, updateStudentAssignment, removeStudentAssignment, fetchStudentAssignments } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE } from './constants';

// ─── STUDENTS Panel ───────────────────────────────────────────────────────────
export default function StudentsPanel({ students, setStudents, routes, stops, buses, showToast }) {
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const EMPTY_STUDENT = { studentId: '', studentName: '', studentClass: '', studentSection: '', routeId: '', routeName: '', stopId: '', stopName: '', busId: '', busNo: '', pickupLocation: '', dropLocation: '' };
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [errors, setErrors] = useState({});
  const [busCapacityFull, setBusCapacityFull] = useState(false);
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsRef = useRef(null);

  const filteredStops = stops.filter(s => !form.routeId || String(s.routeId) === String(form.routeId));

  const filtered = students.filter(s =>
    (!search || s.studentName?.toLowerCase().includes(search.toLowerCase()) || String(s.studentId).includes(search)) &&
    (!filterRoute || String(s.routeId) === String(filterRoute))
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.studentId)          e.studentId  = 'Student ID is required';
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.routeId)            e.routeId     = 'Please select a route';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_STUDENT); setErrors({}); setBusCapacityFull(false); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    const b = buses.find(b => String(b.id) === String(item.busId));
    // Subtract 1 from currentStudents because the student being edited is already counted
    setBusCapacityFull(b ? (b.currentStudents ?? 0) - 1 >= (b.capacity ?? 0) : false);
    setForm({
      studentId:      item.studentId      || '',
      studentName:    item.studentName    || '',
      studentClass:   item.studentClass   || '',
      studentSection: item.studentSection || '',
      routeId:        item.routeId        || '',
      routeName:      item.routeName      || '',
      stopId:         item.stopId         || '',
      stopName:       item.stopName       || '',
      busId:          item.busId          || '',
      busNo:          item.busNo          || '',
      pickupLocation: item.pickupLocation || '',
      dropLocation:   item.dropLocation   || '',
    });
    setErrors({});
    setShowModal(true);
  };

  // When route/stop/bus dropdowns change, also populate the name fields
  const setRoute = (id) => {
    const r = routes.find(r => String(r.id) === String(id));
    const dropLoc = r ? (r.area ? `${r.name} (${r.area})` : r.name) : '';
    setForm(f => ({ ...f, routeId: id, routeName: r?.name || '', stopId: '', stopName: '', dropLocation: dropLoc }));
  };
  const setStop = (id) => {
    const s = stops.find(s => String(s.id) === String(id));
    setForm(f => ({ ...f, stopId: id, stopName: s?.name || '', pickupLocation: s?.name || '' }));
  };
  const setBus = (id) => {
    const b = buses.find(b => String(b.id) === String(id));
    setForm(f => ({ ...f, busId: id, busNo: b?.busNo || '' }));
    setBusCapacityFull(b ? (b.currentStudents ?? 0) >= (b.capacity ?? 0) : false);
  };

  const handleStudentNameChange = async (value) => {
    setForm(f => ({ ...f, studentName: value, studentId: '', studentClass: '', studentSection: '' }));
    if (errors.studentName) setErrors(ev => ({ ...ev, studentName: '' }));
    if (value.trim().length < 2) { setStudentSuggestions([]); setShowSuggestions(false); return; }
    setSuggestionsLoading(true);
    try {
      const res = await adminAPI.searchStudentsForFee(value.trim());
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStudentSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch { setStudentSuggestions([]); setShowSuggestions(false); }
    finally { setSuggestionsLoading(false); }
  };

  const selectStudent = (s) => {
    setForm(f => ({
      ...f,
      studentId:      s.id      || s.studentId || '',
      studentName:    s.name    || s.studentName || '',
      studentClass:   s.class   || s.className  || s.studentClass || '',
      studentSection: s.section || s.sectionName || s.studentSection || '',
    }));
    if (errors.studentId)   setErrors(ev => ({ ...ev, studentId: '' }));
    if (errors.studentName) setErrors(ev => ({ ...ev, studentName: '' }));
    setShowSuggestions(false);
    setStudentSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => { if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!editItem && busCapacityFull) {
      showToast('Transport capacity reached. Cannot assign student.', 'error');
      return;
    }
    try {
      const payload = {
        studentId:      Number(form.studentId),
        studentName:    form.studentName,
        studentClass:   form.studentClass   || null,
        studentSection: form.studentSection || null,
        routeId:        form.routeId  ? Number(form.routeId)  : null,
        routeName:      form.routeName,
        stopId:         form.stopId   ? Number(form.stopId)   : null,
        stopName:       form.stopName,
        busId:          form.busId    ? Number(form.busId)    : null,
        busNo:          form.busNo,
        pickupLocation: form.pickupLocation || null,
        dropLocation:   form.dropLocation   || null,
      };
      if (editItem) {
        await updateStudentAssignment(editItem.id, payload);
        showToast('Student transport updated successfully');
      } else {
        await assignStudent(payload);
        showToast('Student assigned to transport successfully');
      }
      const data = await fetchStudentAssignments();
      setStudents(data);
      setShowModal(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeStudentAssignment(id);
      const data = await fetchStudentAssignments();
      setStudents(data);
      showToast('Student transport assignment removed', 'warning');
    } catch {
      showToast('Failed to remove assignment.', 'error');
    }
    setDeleteId(null);
  };

  const routeName = (id) => routes.find(r => r.id === +id)?.name || '—';
  const stopName  = (id) => stops.find(s => s.id === +id)?.name  || '—';
  const busNo     = (id) => buses.find(b => b.id === +id)?.busNo  || '—';
  const getInitials = (n) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Assign Student" addIcon="person_add"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search student or roll no…"
        filters={[{ value: filterRoute, onChange: v => { setFilterRoute(v); setPage(1); }, options: [{ value: '', label: 'All Routes' }, ...routes.map(r => ({ value: r.id, label: r.name }))] }]}>
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>Route</th><th>Stop</th><th>Bus</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><span className="material-icons">people</span><h3>No students assigned</h3></div></td></tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="student-cell">
                    <div className="student-avatar-sm">{getInitials(s.studentName)}</div>
                    <div>
                      <span className="student-name">{s.studentName}</span>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>ID: {s.studentId}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{routeName(s.routeId)}</td>
                <td>
                  <span style={{ background: '#fff5f7', color: '#805ad5', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
                    {stopName(s.stopId)}
                  </span>
                </td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{s.busNo || busNo(s.busId)}</td>
                <td>
                  <div className="action-btns">
                    <Button variant="edit" onClick={() => openEdit(s)} />
                    <Button variant="delete" title="Remove" onClick={() => setDeleteId(s.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Transport Assignment' : 'Assign Student to Transport'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update' : 'Assign'} size="modal-lg" submitDisabled={!editItem && busCapacityFull}>
          <div className="row g-3">
            <div className="col-md-8" ref={suggestionsRef} style={{ position: 'relative' }}>
              <label className="form-label fw-medium small">Student Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.studentName ? 'is-invalid' : ''}`}
                placeholder="Type name to search student…" value={form.studentName} autoComplete="off"
                onChange={e => handleStudentNameChange(e.target.value)}
                onFocus={() => studentSuggestions.length > 0 && setShowSuggestions(true)} />
              {errors.studentName && <div className="invalid-feedback">{errors.studentName}</div>}
              {showSuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto' }}>
                  {suggestionsLoading
                    ? <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 13 }}>Searching…</div>
                    : studentSuggestions.map((s, i) => (
                      <div key={s.id || i} onMouseDown={() => selectStudent(s)}
                        style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name || s.studentName}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          ID: {s.id || s.studentId}
                          {(s.class || s.className) ? ` · ${formatClassName(s.class || s.className, s.section || s.sectionName)}` : ''}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Student ID *</label>
              <input type="number" className={`form-control form-control-sm ${errors.studentId ? 'is-invalid' : ''}`}
                placeholder="Auto-filled" value={form.studentId} min="1"
                onChange={e => { setForm(f => ({ ...f, studentId: e.target.value })); if (errors.studentId) setErrors(ev => ({ ...ev, studentId: '' })); }} />
              {errors.studentId && <div className="invalid-feedback">{errors.studentId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Class</label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g., 10"
                value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Section</label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g., A"
                value={form.studentSection} onChange={e => setForm(f => ({ ...f, studentSection: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route *</label>
              <select className={`form-select form-select-sm ${errors.routeId ? 'is-invalid' : ''}`}
                value={form.routeId || ''} onChange={e => { setRoute(e.target.value); if (errors.routeId) setErrors(ev => ({ ...ev, routeId: '' })); }}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}{r.area ? ` (${r.area})` : ''}</option>)}
              </select>
              {errors.routeId && <div className="invalid-feedback">{errors.routeId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Boarding Stop</label>
              <select className="form-select form-select-sm" value={form.stopId || ''} onChange={e => setStop(e.target.value)}
                disabled={!form.routeId}>
                <option value="">{form.routeId ? '— Select Stop —' : '— Select route first —'}</option>
                {filteredStops.map(s => <option key={s.id} value={s.id}>{s.name}{s.timing ? ` (${s.timing})` : ''}</option>)}
              </select>
            </div>
            <div className="col-md-12">
              <label className="form-label fw-medium small">Bus</label>
              <select className="form-select form-select-sm" value={form.busId || ''} onChange={e => setBus(e.target.value)}>
                <option value="">— Select Bus (optional) —</option>
                {buses.map(b => {
                  const cur = b.currentStudents ?? 0;
                  const cap = b.capacity ?? 0;
                  const full = cur >= cap;
                  return <option key={b.id} value={b.id} disabled={full && !editItem}>{b.busNo}{b.route ? ` — ${b.route}` : ''} ({cur}/{cap}{full ? ' FULL' : ''})</option>;
                })}
              </select>
              {busCapacityFull && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-icons" style={{ color: '#e53e3e', fontSize: 18 }}>error</span>
                  <span style={{ color: '#c53030', fontSize: 13, fontWeight: 600 }}>Transport capacity reached. Cannot assign student.</span>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Pickup Location</label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g., Main Gate, Sector 12"
                value={form.pickupLocation} onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Drop Location</label>
              <input type="text" className="form-control form-control-sm" placeholder="e.g., School Main Entrance"
                value={form.dropLocation} onChange={e => setForm(f => ({ ...f, dropLocation: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Assignment" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
