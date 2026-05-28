import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'skoolz_bg_v1';
const CUSTOM_KEY  = 'skoolz_bg_custom_v1';

const PRESETS = [
  // Solid
  { id: 'default',    label: 'Default',    bg: '#f8fafc',                                               solid: true },
  { id: 'white',      label: 'White',      bg: '#ffffff',                                               solid: true },
  { id: 'warm',       label: 'Warm',       bg: '#fefce8',                                               solid: true },
  { id: 'blue',       label: 'Blue Tint',  bg: '#eff6ff',                                               solid: true },
  { id: 'mint',       label: 'Mint',       bg: '#f0fdf4',                                               solid: true },
  { id: 'lavender',   label: 'Lavender',   bg: '#faf5ff',                                               solid: true },
  { id: 'rose',       label: 'Rose',       bg: '#fff1f2',                                               solid: true },
  { id: 'slate',      label: 'Slate',      bg: '#f1f5f9',                                               solid: true },
  // Gradients
  { id: 'ocean',      label: 'Ocean',      bg: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)'  },
  { id: 'sunset',     label: 'Sunset',     bg: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%)'  },
  { id: 'aurora',     label: 'Aurora',     bg: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)'  },
  { id: 'forest',     label: 'Forest',     bg: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)'  },
  { id: 'peach',      label: 'Peach',      bg: 'linear-gradient(135deg, #fff7ed 0%, #fce7f3 100%)'  },
  { id: 'sky',        label: 'Sky',        bg: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)'  },
  { id: 'candy',      label: 'Candy',      bg: 'linear-gradient(135deg, #fce7f3 0%, #fef3c7 100%)'  },
  { id: 'nordic',     label: 'Nordic',     bg: 'linear-gradient(135deg, #e2e8f0 0%, #dbeafe 100%)'  },
];

export const loadSavedBg = () => {
  const id = localStorage.getItem(STORAGE_KEY) || 'default';
  if (id === 'custom') return localStorage.getItem(CUSTOM_KEY) || '#f8fafc';
  return PRESETS.find(p => p.id === id)?.bg || '#f8fafc';
};

export default function BgPicker({ value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [selectedId, setSelectedId] = useState(localStorage.getItem(STORAGE_KEY) || 'default');
  const [customColor, setCustomColor] = useState(localStorage.getItem(CUSTOM_KEY) || '#f8fafc');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id) => {
    const bg = PRESETS.find(p => p.id === id)?.bg || '#f8fafc';
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
    onChange(bg);
  };

  const applyCustom = (color) => {
    setCustomColor(color);
    setSelectedId('custom');
    localStorage.setItem(STORAGE_KEY, 'custom');
    localStorage.setItem(CUSTOM_KEY, color);
    onChange(color);
  };

  const solids = PRESETS.filter(p => p.solid);
  const grads  = PRESETS.filter(p => !p.solid);

  const Swatch = ({ preset }) => {
    const active = selectedId === preset.id;
    return (
      <button
        onClick={() => select(preset.id)}
        title={preset.label}
        style={{
          width: 30, height: 30, borderRadius: 9,
          background: preset.bg, cursor: 'pointer', padding: 0, outline: 'none',
          border: active ? '2.5px solid #7c3aed' : '2px solid #e2e8f0',
          boxShadow: active ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
          transition: 'border 0.12s, box-shadow 0.12s',
          flexShrink: 0,
        }}
      />
    );
  };

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 997 }}>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Change background"
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.4)'; }}
      >
        <span className="material-icons" style={{ color: '#fff', fontSize: 22 }}>palette</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 54, left: 0,
          background: '#fff', borderRadius: 16, padding: '18px 20px', width: 280,
          boxShadow: '0 16px 48px rgba(0,0,0,0.16)', border: '1.5px solid #e2e8f0',
        }}>
          {/* Popover arrow */}
          <div style={{
            position: 'absolute', bottom: -7, left: 14,
            width: 14, height: 14, background: '#fff', transform: 'rotate(45deg)',
            borderRight: '1.5px solid #e2e8f0', borderBottom: '1.5px solid #e2e8f0',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#7c3aed' }}>palette</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1a202c' }}>Background Theme</span>
          </div>

          {/* Solid colors */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Solid Colors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {solids.map(p => <Swatch key={p.id} preset={p} />)}
          </div>

          {/* Gradients */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Gradients</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {grads.map(p => <Swatch key={p.id} preset={p} />)}
          </div>

          {/* Custom color */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Custom Color</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={customColor}
              onChange={e => applyCustom(e.target.value)}
              style={{
                width: 38, height: 38, borderRadius: 9, padding: 3,
                border: selectedId === 'custom' ? '2.5px solid #7c3aed' : '2px solid #e2e8f0',
                boxShadow: selectedId === 'custom' ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none',
                cursor: 'pointer', background: 'none', outline: 'none',
              }}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2d3748' }}>Pick any color</div>
              <div style={{ fontSize: 11, color: '#a0aec0' }}>{customColor.toUpperCase()}</div>
            </div>
          </div>

          {/* Reset link */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0f4f8', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { select('default'); }}
              style={{ fontSize: 11, color: '#718096', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', borderRadius: 5 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.background = '#f5f3ff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#718096'; e.currentTarget.style.background = 'none'; }}
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
