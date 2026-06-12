import React from 'react';

// Multi-select component for picking classes from a list.
// `value`    — comma-separated string of selected class labels, e.g. "Class 9 - A, Class 10 - B"
// `onChange` — called with the updated comma-separated string
export default function ClassPicker({ classList = [], value = '', onChange, label = 'Select classes' }) {
  // Parse the current value into a Set of labels for O(1) lookup
  const selected = new Set(
    value.split(',').map(s => s.trim()).filter(Boolean)
  );

  const toggle = (label) => {
    const next = new Set(selected);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    onChange([...next].join(', '));
  };

  if (classList.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        No classes available. Add classes first.
      </p>
    );
  }

  return (
    <div>
      {/* Selected chips */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {[...selected].map(lbl => (
            <span key={lbl} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#0de1e820', color: '#276749', border: '1px solid #0de1e860',
              borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
            }}>
              {lbl}
              <span
                onClick={() => toggle(lbl)}
                style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, color: '#e53e3e' }}
              >×</span>
            </span>
          ))}
        </div>
      )}

      {/* Scrollable checklist */}
      <div style={{
        maxHeight: 160, overflowY: 'auto', border: '1.5px solid var(--border-strong)',
        borderRadius: 8, padding: '4px 0', background: 'var(--surface-alt)',
      }}>
        {classList.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', margin: 0 }}>
            No classes available
          </p>
        ) : (
          classList.map(c => {
            const lbl = `${c.name}${c.section ? ` - ${c.section}` : ''}`;
            const checked = selected.has(lbl);
            return (
              <label key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', cursor: 'pointer',
                background: checked ? '#f0fff4' : 'transparent',
                transition: 'background 0.15s',
              }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(lbl)}
                  style={{ accentColor: '#0de1e8', width: 14, height: 14, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{lbl}</span>
              </label>
            );
          })
        )}
      </div>

      {selected.size === 0 && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
      )}
    </div>
  );
}
