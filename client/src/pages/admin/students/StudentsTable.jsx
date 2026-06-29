import Button from '../../../components/Button';
import { formatDOB, PAGE_SIZE } from './constants';
import * as XLSX from 'xlsx';

async function downloadPendingCredentials(adminAPI, showToast) {
  const LOGIN_URL = 'https://my-skoolz.com/login';
  const INSTRUCTION = 'Select Student role → enter Admission Number as username → enter Temp Password → change password on first login';
  try {
    const res = await adminAPI.getPendingStudentCredentials();
    const rows = res.data?.data ?? [];
    if (rows.length === 0) {
      showToast?.('No pending credentials — all students have already set their own passwords.', 'info');
      return;
    }
    // Build as array-of-arrays so we can force every cell to text type.
    // Passwords contain @#$! — Excel interprets cells starting with @ as
    // formulas and corrupts them. Explicit text type prevents this.
    const headers = [
      'S.No', 'Student Name', 'Admission Number', 'Class',
      'Login Username', 'Login Email', 'Temporary Password',
      'Login URL', 'First Login Instructions',
    ];
    const data = rows.map((r, idx) => [
      idx + 1,
      r.studentName     || '',
      r.admissionNumber || '',
      r.className       || '',
      r.username        || r.admissionNumber || '',
      r.loginEmail      || '',
      r.tempPassword    || '',
      LOGIN_URL,
      INSTRUCTION,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    // Force all cells in every row to type 's' (string) so Excel never
    // interprets values as formulas regardless of leading characters.
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (ws[addr]) ws[addr].t = 's';
      }
    }
    ws['!cols'] = [
      { wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
      { wch: 18 }, { wch: 28 }, { wch: 18 },
      { wch: 30 }, { wch: 55 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
    XLSX.writeFile(wb, 'pending_student_credentials.xlsx');
    showToast?.(`Downloaded credentials for ${rows.length} student${rows.length > 1 ? 's' : ''}.`, 'success');
  } catch {
    showToast?.('Failed to download credentials.', 'error');
  }
}

export default function StudentsTable({
  loadingStudents, students, paginated, totalElements,
  searchTerm, setSearchTerm, setCurrentPage,
  filterClass, setFilterClass, filterClassOptions,
  filterStatus, setFilterStatus, totalActive, totalInactive,
  setShowBulkImport, setShowExportModal, adminAPI, showToast,
  setPromoteForm, setShowPromoteModal,
  selectionMode, setSelectionMode, exitSelectionMode,
  selectedIds, isAllPageSelected, toggleSelect, toggleSelectAll, setBulkDeleteConfirm,
  openAddModal, getInitials,
  onView, onEdit, onViewCredentials, onCreateAccount, onDelete,
  currentPage, totalPages,
}) {
  return (
    <div className="data-table-card">
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="material-icons">search</span>
          <input type="text" className="search-input" placeholder="Search by name, roll no, father/mother…"
            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(0); }} />
        </div>
        <select className="filter-select" value={filterClass} onChange={e => { setFilterClass(e.target.value); setCurrentPage(0); }}>
          <option value="">All Classes</option>
          {filterClassOptions.length === 0
            ? <option disabled>No classes added yet</option>
            : filterClassOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))
          }
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(0); }}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button
          onClick={() => setShowBulkImport(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px',
            border: '1.5px solid #7c3aed', background: '#faf5ff',
            color: '#7c3aed', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-icons" style={{ fontSize: '17px' }}>upload_file</span>
          Bulk Import
        </button>
        <button
          onClick={() => downloadPendingCredentials(adminAPI, showToast)}
          title="Download temp passwords for students who haven't logged in yet"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px',
            border: '1.5px solid #0369a1', background: '#eff6ff',
            color: '#0369a1', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-icons" style={{ fontSize: '17px' }}>key</span>
          Download Credentials
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px',
            border: '1.5px solid #276749', background: '#f0fff4',
            color: '#276749', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-icons" style={{ fontSize: '17px' }}>table_view</span>
          Export Excel
        </button>
        <button
          onClick={() => { setPromoteForm({ fromClass: '', fromSection: '', toClass: '', toSection: '' }); setShowPromoteModal(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 16px', borderRadius: '9px',
            border: '1.5px solid #d69e2e', background: '#fffff0',
            color: '#b7791f', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-icons" style={{ fontSize: '17px' }}>upgrade</span>
          Promote Class
        </button>
        {!selectionMode ? (
          <>
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '9px',
                border: '1.5px solid #e53e3e', background: '#fff5f5',
                color: '#e53e3e', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-icons" style={{ fontSize: '17px' }}>checklist</span>
              Select to Delete
            </button>
            <Button variant="add" onClick={openAddModal}>
              <span className="material-icons">person_add</span> Add Student
            </Button>
          </>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '9px',
                  border: '1.5px solid #e53e3e', background: '#e53e3e',
                  color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-icons" style={{ fontSize: '17px' }}>delete_sweep</span>
                Delete ({selectedIds.size})
              </button>
            )}
            <button
              onClick={exitSelectionMode}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '9px',
                border: '1.5px solid var(--border-strong)', background: 'var(--surface)',
                color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-icons" style={{ fontSize: '17px' }}>close</span>
              Cancel
            </button>
          </>
        )}
      </div>

      {/* ── Account Status Toggles ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Account Status:
        </span>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
          {/* All */}
          <button
            onClick={() => { setFilterStatus(''); setCurrentPage(0); }}
            style={{
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: filterStatus === '' ? '#fff' : 'transparent',
              color: filterStatus === '' ? '#1e293b' : '#94a3b8',
              fontWeight: 700, fontSize: 12,
              boxShadow: filterStatus === '' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {/* Active */}
          <button
            onClick={() => { setFilterStatus(filterStatus === 'Active' ? '' : 'Active'); setCurrentPage(0); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: filterStatus === 'Active' ? '#22c55e' : 'transparent',
              color: filterStatus === 'Active' ? '#fff' : '#64748b',
              fontWeight: 700, fontSize: 12,
              boxShadow: filterStatus === 'Active' ? '0 2px 8px rgba(34,197,94,0.35)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-icons" style={{ fontSize: 14 }}>check_circle</span>
            Active
            <span style={{
              background: filterStatus === 'Active' ? 'rgba(255,255,255,0.28)' : '#e2e8f0',
              color: filterStatus === 'Active' ? '#fff' : '#64748b',
              borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800,
            }}>{totalActive}</span>
          </button>
          {/* Inactive */}
          <button
            onClick={() => { setFilterStatus(filterStatus === 'Inactive' ? '' : 'Inactive'); setCurrentPage(0); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: filterStatus === 'Inactive' ? '#ef4444' : 'transparent',
              color: filterStatus === 'Inactive' ? '#fff' : '#64748b',
              fontWeight: 700, fontSize: 12,
              boxShadow: filterStatus === 'Inactive' ? '0 2px 8px rgba(239,68,68,0.35)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-icons" style={{ fontSize: 14 }}>cancel</span>
            Inactive
            <span style={{
              background: filterStatus === 'Inactive' ? 'rgba(255,255,255,0.28)' : '#e2e8f0',
              color: filterStatus === 'Inactive' ? '#fff' : '#64748b',
              borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800,
            }}>{totalInactive}</span>
          </button>
        </div>
        {filterStatus && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalElements}</strong>{' '}
            {filterStatus.toLowerCase()} student{totalElements !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {selectionMode && (
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAll}
                    title="Select all on this page"
                    style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#e53e3e' }}
                  />
                </th>
              )}
              <th>Student</th>
              <th>Roll No</th>
              <th>Class</th>
              <th>Section</th>
              <th>Father's Name</th>
              <th>Father's Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingStudents ? (
              <tr><td colSpan={selectionMode ? 9 : 8}>
                <div className="empty-state">
                  <span className="material-icons" style={{ animation: 'spin 1s linear infinite', fontSize: 40, color: 'var(--text-muted)' }}>refresh</span>
                  <h3>Loading students…</h3>
                </div>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={selectionMode ? 9 : 8}>
                <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <span className="material-icons" style={{ fontSize: 56, color: '#c7d2fe', display: 'block', marginBottom: 12 }}>
                    {students.length === 0 ? 'school' : 'search_off'}
                  </span>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 6px' }}>
                    {students.length === 0 ? 'No students yet' : 'No students match your search'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 20px', fontSize: 14 }}>
                    {students.length === 0
                      ? 'Add your first student to get started.'
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                  {students.length === 0 && (
                    <Button onClick={() => openAddModal()} style={{ borderRadius: 8 }}>
                      + Add First Student
                    </Button>
                  )}
                </div>
              </td></tr>
            ) : paginated.map(s => (
              <tr key={s.id} style={{ background: selectionMode && selectedIds.has(s.id) ? '#fff5f5' : undefined }}>
                {selectionMode && (
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#e53e3e' }}
                    />
                  </td>
                )}
                <td>
                  <div className="student-cell">
                    {s.photo ? (
                      <img src={s.photo} alt={s.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div className="student-avatar-sm">{getInitials(s.name)}</div>
                    )}
                    <div>
                      <div className="student-name">{s.name}</div>
                      <div className="student-class">DOB: {formatDOB(s.dob)}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.rollNo}</td>
                <td><span style={{ fontSize: '13px', fontWeight: 700 }}>{String(s.class || '—').replace(/^Class\s+/i, '')}</span></td>
                <td><span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 700, background: '#3182ce20', color: '#2b6cb0' }}>{s.section || '—'}</span></td>
                <td style={{ fontSize: '13px' }}>{s.fatherName || s.parent || '—'}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.fatherPhone || s.mobile || '—'}</td>
                <td>
                  <span className={`status-badge ${s.status === 'Active' ? 'status-present' : 'status-absent'}`}>{s.status}</span>
                  {s.deletionStatus === 'PENDING' && (
                    <span style={{
                      display: 'inline-block', marginLeft: 6, padding: '2px 9px', borderRadius: 20,
                      fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e',
                      border: '1px solid #fcd34d', whiteSpace: 'nowrap',
                    }}>
                      Deletion Pending
                    </span>
                  )}
                </td>
                <td>
                  <div className="action-btns">
                    <Button variant="view" onClick={() => onView(s)} />
                    <Button variant="edit" onClick={() => onEdit(s)} />
                    {s.studentUserId ? (
                      <button className="action-btn" title="View Login Credentials"
                        onClick={() => onViewCredentials(s)}
                        style={{ color: '#6d28d9', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>key</span>
                      </button>
                    ) : (
                      <button className="action-btn" title="Create login account"
                        onClick={() => onCreateAccount(s)}
                        style={{ color: '#276749', background: '#f0fff4', border: '1px solid #c6f6d5' }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>person_add</span>
                      </button>
                    )}
                    {s.deletionStatus === 'PENDING' ? (
                      <button className="action-btn" title="Deletion request awaiting Super Admin approval" disabled
                        style={{ color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', cursor: 'not-allowed', opacity: 0.7 }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>hourglass_top</span>
                      </button>
                    ) : (
                      <Button variant="delete" onClick={() => onDelete(s)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-bar">
          <div className="pagination-info">
            Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of {totalElements}
          </div>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
              <span className="material-icons" style={{ fontSize: '16px' }}>chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              // Show pages around currentPage when there are many pages
              const start = Math.max(0, Math.min(currentPage - 4, totalPages - 10));
              const p = start + i;
              return (
                <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p + 1}</button>
              );
            })}
            <button className="page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
              <span className="material-icons" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
