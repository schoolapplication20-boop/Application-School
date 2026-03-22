/**
 * StudentExportModal.jsx
 * Excel export modal for student data with:
 *  - Filter by class, section, academic year
 *  - Live preview of row count
 *  - Download history (in-memory only, no localStorage)
 *  - Redownload / delete history entries
 */
import React, { useState, useMemo, useEffect } from 'react';
import { exportStudentsToExcel, ACADEMIC_YEARS, getCurrentAY } from '../utils/excelExport';

const MAX_HISTORY = 20;

const CLASS_OPTIONS = [
  { group: 'Pre-Primary', items: ['Nursery', 'LKG', 'UKG'] },
  { group: 'Primary (1–5)', items: ['1', '2', '3', '4', '5'] },
  { group: 'Secondary (6–12)', items: ['6', '7', '8', '9', '10', '11', '12'] },
];
const ALL_CLASSES = CLASS_OPTIONS.flatMap(g => g.items);

// ── helpers ───────────────────────────────────────────────────────────────────
const getSections = (students, cls) => {
  const src = cls === 'All'
    ? students
    : students.filter(s => String(s.class) === String(cls));
  return [...new Set(src.map(s => s.section).filter(Boolean))].sort();
};

// ── Sub-components ────────────────────────────────────────────────────────────
function FilterSelect({ label, icon, value, onChange, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4a5568', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span className="material-icons" style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: '#a0aec0', fontSize: '16px', pointerEvents: 'none',
        }}>{icon}</span>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 32px', borderRadius: '8px',
            border: '1.5px solid #e2e8f0', fontSize: '13px', background: '#fff',
            outline: 'none', cursor: 'pointer', appearance: 'none',
          }}
        >
          {children}
        </select>
        <span className="material-icons" style={{
          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
          color: '#a0aec0', fontSize: '14px', pointerEvents: 'none',
        }}>expand_more</span>
      </div>
    </div>
  );
}

function HistoryRow({ entry, onRedownload, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderRadius: '10px', background: '#f8fafc',
      border: '1px solid #e8edf2', marginBottom: '8px',
    }}>
      {/* Icon */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px', background: '#ebf4ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="material-icons" style={{ color: '#3182ce', fontSize: '18px' }}>table_view</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px', fontWeight: 700, color: '#1a202c',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={entry.fileName}>
          {entry.fileName}
        </div>
        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
          {entry.records} records · {entry.academicYear}
          {entry.className !== 'All' ? ` · Class ${entry.className}` : ''}
          {entry.section !== 'All' ? `-${entry.section}` : ''}
          {' · '}{new Date(entry.downloadedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={() => onRedownload(entry)}
        title="Re-download"
        style={{
          width: '30px', height: '30px', borderRadius: '7px', border: 'none',
          background: '#ebf4ff', color: '#3182ce', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <span className="material-icons" style={{ fontSize: '14px' }}>download</span>
      </button>
      <button
        onClick={() => onDelete(entry.id)}
        title="Remove from history"
        style={{
          width: '30px', height: '30px', borderRadius: '7px', border: 'none',
          background: '#fff5f5', color: '#e53e3e', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
      </button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function StudentExportModal({ students, onClose }) {
  const [tab, setTab]                 = useState('export'); // 'export' | 'history'
  const [className, setClassName]     = useState('All');
  const [section, setSection]         = useState('All');
  const [academicYear, setAcademicYear] = useState(getCurrentAY());
  const [includeFields, setIncludeFields] = useState({
    basic: true, parent: true, contact: true, address: true,
  });
  const [loading, setLoading]         = useState(false);
  const [history, setHistory]         = useState([]);

  // Sections available for the selected class
  const availableSections = useMemo(() => getSections(students, className), [students, className]);

  // Reset section if it's no longer valid
  useEffect(() => {
    if (section !== 'All' && !availableSections.includes(section)) {
      setSection('All');
    }
  }, [availableSections, section]);

  // Live-filtered count
  const previewStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass   = className === 'All' || String(s.class) === String(className);
      const matchSection = section === 'All' || s.section === section;
      return matchClass && matchSection;
    });
  }, [students, className, section]);

  // ── Columns config ───────────────────────────────────────────────────────────
  const FIELD_GROUPS = [
    {
      key: 'basic',
      label: 'Basic Information',
      icon: 'badge',
      cols: ['Student Name', 'Roll Number', 'Class', 'Section', 'Date of Birth', 'Blood Group', 'Status'],
    },
    {
      key: 'parent',
      label: 'Parent Information',
      icon: 'family_restroom',
      cols: ["Father's Name", "Mother's Name", 'Guardian Name'],
    },
    {
      key: 'contact',
      label: 'Contact Details',
      icon: 'phone',
      cols: ["Father's Phone", "Mother's Phone", 'Guardian Phone'],
    },
    {
      key: 'address',
      label: 'Address Details',
      icon: 'home',
      cols: ['Permanent Address', 'Alternate Address'],
    },
  ];

  const selectedCols = FIELD_GROUPS.filter(g => includeFields[g.key]).flatMap(g => g.cols);

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!previewStudents.length) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 350)); // brief UX feedback

    try {
      const fileName = exportStudentsToExcel(previewStudents, { className, section, academicYear });

      const entry = {
        id:           Date.now(),
        fileName,
        className,
        section,
        academicYear,
        records:      previewStudents.length,
        downloadedAt: new Date().toISOString(),
        snapshot:     previewStudents, // store snapshot for re-download
      };
      const updated = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleRedownload = (entry) => {
    exportStudentsToExcel(entry.snapshot || students, {
      className:    entry.className,
      section:      entry.section,
      academicYear: entry.academicYear,
      fileName:     entry.fileName,
    });
  };

  const handleDeleteHistory = (id) => {
    const updated = history.filter(e => e.id !== id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    setHistory([]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px', width: '640px', maxWidth: '100%',
        maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a6b1a, #276749)',
          padding: '18px 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: '22px' }}>table_view</span>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>Export Student Data</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>
                  Download as Excel (.xlsx) with custom filters
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
              width: '32px', height: '32px', cursor: 'pointer', color: '#fff', fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {[
              { key: 'export',  icon: 'download',  label: 'New Export' },
              { key: 'history', icon: 'history',    label: `History${history.length ? ` (${history.length})` : ''}` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px',
                  background: tab === t.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                  color: '#fff',
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ════ EXPORT TAB ════ */}
          {tab === 'export' && (
            <>
              {/* Filters */}
              <div style={{
                background: '#f8fafc', borderRadius: '12px', padding: '18px',
                border: '1px solid #e8edf2', marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                  Filter Options
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {/* Class */}
                  <FilterSelect label="Class" icon="class" value={className} onChange={(v) => { setClassName(v); setSection('All'); }}>
                    <option value="All">All Classes</option>
                    {CLASS_OPTIONS.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map(c => (
                          <option key={c} value={c}>
                            {['Nursery', 'LKG', 'UKG'].includes(c) ? c : `Class ${c}`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </FilterSelect>

                  {/* Section */}
                  <FilterSelect label="Section" icon="view_list" value={section} onChange={setSection}>
                    <option value="All">All Sections</option>
                    {availableSections.map(s => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </FilterSelect>

                  {/* Academic Year */}
                  <FilterSelect label="Academic Year" icon="event" value={academicYear} onChange={setAcademicYear}>
                    {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
                  </FilterSelect>
                </div>
              </div>

              {/* Columns to include */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Columns to Include
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {FIELD_GROUPS.map(g => (
                    <label key={g.key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `1.5px solid ${includeFields[g.key] ? '#76C442' : '#e2e8f0'}`,
                      background: includeFields[g.key] ? '#f0fff4' : '#fafafa',
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="checkbox"
                        checked={includeFields[g.key]}
                        onChange={() => setIncludeFields(f => ({ ...f, [g.key]: !f[g.key] }))}
                        style={{ marginTop: '2px', accentColor: '#76C442', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span className="material-icons" style={{ fontSize: '14px', color: '#76C442' }}>{g.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a202c' }}>{g.label}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#a0aec0', lineHeight: 1.4 }}>
                          {g.cols.join(' · ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{
                borderRadius: '12px', border: '1px solid #e8edf2',
                overflow: 'hidden', marginBottom: '20px',
              }}>
                {/* Preview header */}
                <div style={{
                  background: '#1d3a1d', padding: '10px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>preview</span>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>Preview</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      background: previewStudents.length ? '#76C442' : '#e53e3e',
                      color: '#fff', fontSize: '11px', fontWeight: 700,
                      padding: '2px 10px', borderRadius: '12px',
                    }}>
                      {previewStudents.length} student{previewStudents.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                      · {selectedCols.length} column{selectedCols.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Preview table */}
                <div style={{ overflowX: 'auto', maxHeight: '180px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f0fff4', position: 'sticky', top: 0 }}>
                        {['S.No', ...selectedCols].map(h => (
                          <th key={h} style={{
                            padding: '7px 10px', textAlign: 'left', whiteSpace: 'nowrap',
                            color: '#276749', fontWeight: 700, borderBottom: '1.5px solid #c6f6d5',
                            fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewStudents.length === 0 ? (
                        <tr>
                          <td colSpan={selectedCols.length + 1} style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>
                            No students match the selected filters
                          </td>
                        </tr>
                      ) : previewStudents.slice(0, 5).map((s, i) => (
                        <tr key={s.id || i} style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 ? '#fafbfc' : '#fff' }}>
                          <td style={{ padding: '6px 10px', color: '#a0aec0', fontWeight: 600 }}>{i + 1}</td>
                          {selectedCols.map(col => {
                            const val = {
                              'Student Name':     s.name,
                              'Roll Number':      s.rollNo,
                              'Class':            s.class ? `Class ${s.class}` : '',
                              'Section':          s.section,
                              'Date of Birth':    s.dob,
                              'Blood Group':      s.bloodGroup,
                              'Status':           s.status,
                              "Father's Name":    s.fatherName || s.parent,
                              "Father's Phone":   s.fatherPhone || s.mobile,
                              "Mother's Name":    s.motherName,
                              "Mother's Phone":   s.motherPhone,
                              'Guardian Name':    s.guardianName,
                              'Guardian Phone':   s.guardianPhone,
                              'Permanent Address':s.permanentAddress || s.address,
                              'Alternate Address':s.alternateAddress,
                            }[col] || '';
                            return (
                              <td key={col} style={{
                                padding: '6px 10px', color: '#2d3748', whiteSpace: 'nowrap',
                                maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>{val || '—'}</td>
                            );
                          })}
                        </tr>
                      ))}
                      {previewStudents.length > 5 && (
                        <tr>
                          <td colSpan={selectedCols.length + 1} style={{
                            padding: '6px 10px', textAlign: 'center',
                            color: '#a0aec0', fontSize: '11px', fontStyle: 'italic',
                          }}>
                            … and {previewStudents.length - 5} more rows in the full export
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary strip */}
              {previewStudents.length > 0 && (
                <div style={{
                  display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px',
                }}>
                  {[
                    { label: 'Active',   value: previewStudents.filter(s => s.status === 'Active').length,   color: '#38a169' },
                    { label: 'Inactive', value: previewStudents.filter(s => s.status === 'Inactive').length, color: '#e53e3e' },
                    { label: 'Classes',  value: new Set(previewStudents.map(s => s.class)).size,             color: '#3182ce' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      flex: 1, padding: '10px 14px', borderRadius: '10px',
                      background: stat.color + '10', border: `1px solid ${stat.color}30`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════ HISTORY TAB ════ */}
          {tab === 'history' && (
            <div>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <span className="material-icons" style={{ fontSize: '52px', color: '#e2e8f0', display: 'block', marginBottom: '10px' }}>history</span>
                  <div style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500 }}>No export history yet</div>
                  <div style={{ color: '#cbd5e0', fontSize: '12px', marginTop: '4px' }}>
                    Downloads will appear here for quick re-access
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', color: '#4a5568', fontWeight: 600 }}>
                      {history.length} export{history.length !== 1 ? 's' : ''} saved
                    </div>
                    <button onClick={handleClearAll} style={{
                      background: 'none', border: 'none', color: '#e53e3e',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>delete_sweep</span>
                      Clear All
                    </button>
                  </div>
                  {history.map(entry => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      onRedownload={handleRedownload}
                      onDelete={handleDeleteHistory}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        {tab === 'export' && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #e8edf2',
            background: '#fafbfc', flexShrink: 0,
            display: 'flex', gap: '10px', alignItems: 'center',
          }}>
            <div style={{ fontSize: '12px', color: '#a0aec0', flex: 1 }}>
              {Object.values(includeFields).every(v => !v)
                ? <span style={{ color: '#e53e3e' }}>Select at least one column group</span>
                : `${previewStudents.length} row${previewStudents.length !== 1 ? 's' : ''} · ${selectedCols.length} column${selectedCols.length !== 1 ? 's' : ''} · .xlsx format`
              }
            </div>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '9px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#4a5568', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading || previewStudents.length === 0 || Object.values(includeFields).every(v => !v)}
              style={{
                padding: '10px 24px', borderRadius: '9px', border: 'none', fontWeight: 700,
                fontSize: '13px', cursor: (loading || !previewStudents.length) ? 'not-allowed' : 'pointer',
                background: (loading || !previewStudents.length) ? '#a0aec0' : 'linear-gradient(135deg, #76C442, #5fa832)',
                color: '#fff', display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <span className="material-icons" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>refresh</span>
                  Generating...
                </>
              ) : (
                <>
                  <span className="material-icons" style={{ fontSize: '16px' }}>download</span>
                  Download Excel
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
