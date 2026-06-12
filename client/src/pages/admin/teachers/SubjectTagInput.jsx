import React from 'react';
import { subjectColor } from './constants';

// `value`    — comma-separated subjects string, e.g. "English, Maths"
// `onChange` — called with updated comma-separated string
// `hasError` — highlights border red
export default function SubjectTagInput({ value = '', onChange, hasError = false }) {
  const [input, setInput] = React.useState('');
  const inputRef = React.useRef(null);

  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const add = (raw) => {
    const v = raw.trim();
    if (!v || tags.includes(v)) { setInput(''); return; }
    onChange([...tags, v].join(', '));
    setInput('');
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag).join(', '));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    else if (e.key === 'Backspace' && !input && tags.length > 0) remove(tags[tags.length - 1]);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        minHeight: 38, padding: '5px 8px',
        border: `1.5px solid ${hasError ? '#e53e3e' : 'var(--border-strong)'}`,
        borderRadius: 8, background: 'var(--surface)', cursor: 'text',
        display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
      }}
    >
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 9px', borderRadius: 12, fontSize: 12, fontWeight: 600,
          background: subjectColor(tag) + '22', color: subjectColor(tag),
          border: `1px solid ${subjectColor(tag)}44`,
        }}>
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); remove(tag); }}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#e53e3e', display: 'flex', lineHeight: 1 }}>
            <span className="material-icons" style={{ fontSize: 13 }}>close</span>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={tags.length === 0 ? 'Type subject, press Enter or ,' : '+ add more'}
        style={{
          border: 'none', outline: 'none', fontSize: 13, padding: '2px 2px',
          flex: 1, minWidth: 100, background: 'transparent', color: 'var(--text-primary)',
          fontFamily: 'Poppins, sans-serif',
        }}
      />
    </div>
  );
}
