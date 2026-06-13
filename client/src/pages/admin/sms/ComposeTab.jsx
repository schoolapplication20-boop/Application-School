import React, { useEffect, useRef, useState } from 'react';
import { smsAPI } from '../../../services/api';
import { sortClassNames } from '../../../utils/classOrder';
import { TARGET_TYPES, extractVariables, countSegments } from './constants';

const today = () => new Date().toISOString().split('T')[0];

function parsePhones(text) {
  return [...new Set(
    text.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
  )];
}

const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };

export default function ComposeTab({ templates, classrooms, students, showToast, onSent }) {
  const dbClasses = [...new Set(classrooms.map(c => c.name))].sort(sortClassNames);

  const [targetType, setTargetType] = useState('SCHOOL');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [customPhonesText, setCustomPhonesText] = useState('');
  const [date, setDate] = useState(today());
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [variables, setVariables] = useState({});
  const [scheduledFor, setScheduledFor] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // Sections available for the selected class
  const sectionsForClass = [...new Set(
    classrooms.filter(c => c.name === className).map(c => c.section).filter(Boolean)
  )].sort();

  // Keep the `variables` map in sync with placeholders found in the message
  useEffect(() => {
    const vars = extractVariables(message);
    setVariables(prev => {
      const next = {};
      vars.forEach(v => { next[v] = prev[v] ?? ''; });
      return next;
    });
  }, [message]);

  // Reset target-specific fields when targetType changes
  useEffect(() => {
    setPreview(null);
  }, [targetType, className, section, selectedStudentIds, customPhonesText, date]);

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    if (id) {
      const tpl = templates.find(t => String(t.id) === String(id));
      setMessage(tpl?.content || '');
    } else {
      setMessage('');
    }
  };

  const handleMessageChange = (val) => {
    setMessage(val);
    if (templateId) setTemplateId(''); // editing switches to a custom message
  };

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q);
  }).slice(0, 50);

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const buildSelectionParams = () => {
    switch (targetType) {
      case 'CLASS':     return { targetType, className };
      case 'SECTION':   return { targetType, className, section };
      case 'STUDENTS':  return { targetType, studentIds: selectedStudentIds.join(',') };
      case 'CUSTOM':    return { targetType, customPhones: parsePhones(customPhonesText).join(',') };
      case 'ABSENTEES': return { targetType, date };
      default:          return { targetType };
    }
  };

  const validateTarget = () => {
    if (targetType === 'CLASS' && !className) return 'Select a class';
    if (targetType === 'SECTION' && (!className || !section)) return 'Select a class and section';
    if (targetType === 'STUDENTS' && selectedStudentIds.length === 0) return 'Select at least one student';
    if (targetType === 'CUSTOM' && parsePhones(customPhonesText).length === 0) return 'Enter at least one phone number';
    return null;
  };

  const validateMessage = () => {
    if (!templateId && !message.trim()) return 'Enter a message or select a template';
    return null;
  };

  const handlePreview = async () => {
    const err = validateTarget();
    if (err) { showToast(err, 'error'); return; }
    setPreviewLoading(true);
    try {
      const res = await smsAPI.previewRecipients(buildSelectionParams());
      setPreview(res.data?.data ?? null);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load recipient preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    const targetErr = validateTarget();
    if (targetErr) { showToast(targetErr, 'error'); return; }
    const msgErr = validateMessage();
    if (msgErr) { showToast(msgErr, 'error'); return; }

    const payload = {
      targetType,
      templateId: templateId || undefined,
      message: !templateId ? message.trim() : undefined,
      variables,
      scheduledFor: scheduledFor || undefined,
      idempotencyKey: idempotencyKeyRef.current,
    };
    if (targetType === 'CLASS' || targetType === 'SECTION') payload.className = className;
    if (targetType === 'SECTION') payload.section = section;
    if (targetType === 'STUDENTS') payload.studentIds = selectedStudentIds;
    if (targetType === 'CUSTOM') payload.customPhones = parsePhones(customPhonesText);
    if (targetType === 'ABSENTEES') payload.date = date;

    setSending(true);
    try {
      const res = await smsAPI.sendBulk(payload);
      if (res.data?.success) {
        showToast(res.data?.message || 'Campaign queued');
        idempotencyKeyRef.current = crypto.randomUUID();
        setMessage('');
        setTemplateId('');
        setVariables({});
        setScheduledFor('');
        setPreview(null);
        setSelectedStudentIds([]);
        setCustomPhonesText('');
        onSent?.();
      } else {
        showToast(res.data?.message || 'Failed to send', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to send campaign', 'error');
    } finally {
      setSending(false);
    }
  };

  const segments = countSegments(message);
  const isScheduled = !!scheduledFor;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
      {/* ── Audience ───────────────────────────────────────────── */}
      <div className="data-table-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Audience</h3>

        <label style={labelStyle}>Send to</label>
        <select value={targetType} onChange={e => setTargetType(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <p style={{ margin: '-8px 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          {TARGET_TYPES.find(t => t.value === targetType)?.desc}
        </p>

        {targetType === 'CLASS' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Class</label>
            <select value={className} onChange={e => setClassName(e.target.value)} style={inputStyle}>
              <option value="">— Select class —</option>
              {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        )}

        {targetType === 'SECTION' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Class</label>
              <select value={className} onChange={e => { setClassName(e.target.value); setSection(''); }} style={inputStyle}>
                <option value="">— Class —</option>
                {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Section</label>
              <select value={section} onChange={e => setSection(e.target.value)} style={inputStyle} disabled={!className}>
                <option value="">— Section —</option>
                {sectionsForClass.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {targetType === 'STUDENTS' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Students ({selectedStudentIds.length} selected)</label>
            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by name or roll no…" style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No students found</div>
              ) : filteredStudents.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.className}{s.section ? `-${s.section}` : ''}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {targetType === 'CUSTOM' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Phone numbers (one per line or comma-separated)</label>
            <textarea value={customPhonesText} onChange={e => setCustomPhonesText(e.target.value)} rows={5}
              placeholder={'9876543210\n9123456780'} style={{ ...inputStyle, resize: 'vertical' }} />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{parsePhones(customPhonesText).length} number(s) entered</p>
          </div>
        )}

        {targetType === 'ABSENTEES' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Attendance date</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
        )}

        <button onClick={handlePreview} disabled={previewLoading}
          style={{ width: '100%', padding: '9px 0', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: previewLoading ? 'not-allowed' : 'pointer' }}>
          {previewLoading ? 'Loading…' : 'Preview Recipients'}
        </button>

        {preview && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-alt)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>
              {preview.totalCount} recipient{preview.totalCount === 1 ? '' : 's'}
            </div>
            {preview.sample?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {preview.sample.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {s.name ? `${s.name} — ` : ''}{s.phone}
                  </div>
                ))}
                {preview.totalCount > preview.sample.length && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>…and {preview.totalCount - preview.sample.length} more</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Message ────────────────────────────────────────────── */}
      <div className="data-table-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Message</h3>

        <label style={labelStyle}>Template (optional)</label>
        <select value={templateId} onChange={e => handleTemplateChange(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          <option value="">— Custom message —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <label style={labelStyle}>Message content</label>
        <textarea value={message} onChange={e => handleMessageChange(e.target.value)} rows={6}
          placeholder="Type your message… use {{variable}} for placeholders. {{name}} is auto-filled with the recipient's name."
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        <p style={{ margin: '6px 0 16px', fontSize: 11, color: 'var(--text-muted)' }}>
          {message.length} character{message.length === 1 ? '' : 's'} · {segments} SMS segment{segments === 1 ? '' : 's'}
        </p>

        {Object.keys(variables).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Template variables</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {Object.keys(variables).map(key => (
                <div key={key}>
                  <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>{`{{${key}}}`}</label>
                  <input value={variables[key]} onChange={e => setVariables(v => ({ ...v, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={labelStyle}>Schedule for later (optional)</label>
        <input type="datetime-local" value={scheduledFor} min={new Date().toISOString().slice(0, 16)}
          onChange={e => setScheduledFor(e.target.value)} style={{ ...inputStyle, marginBottom: 16, maxWidth: 280 }} />

        <button onClick={handleSend} disabled={sending}
          style={{ padding: '11px 28px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-icons" style={{ fontSize: 18 }}>{isScheduled ? 'schedule_send' : 'send'}</span>
          {sending ? 'Sending…' : isScheduled ? 'Schedule Campaign' : 'Send Now'}
        </button>
      </div>
    </div>
  );
}
