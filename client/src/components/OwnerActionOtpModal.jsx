import React, { useState, useRef, useEffect } from 'react';
import { ownerAPI } from '../services/api';

const OTP_EXPIRY = 600; // 10 minutes in seconds

/**
 * Reusable OTP confirmation modal for destructive owner actions.
 * Props:
 *   title        – modal heading
 *   description  – what is about to be deleted (JSX or string)
 *   onConfirmed  – async callback to run after OTP is verified
 *   onClose      – called when cancelled
 */
export default function OwnerActionOtpModal({ title, description, onConfirmed, onClose }) {
  const [step,       setStep]       = useState('warn');   // 'warn' | 'otp' | 'verifying' | 'confirmed'
  const [otp,        setOtp]        = useState(['', '', '', '', '', '']);
  const [sending,    setSending]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [error,      setError]      = useState('');
  const [timer,      setTimer]      = useState(OTP_EXPIRY);
  const [canResend,  setCanResend]  = useState(false);
  const inputRefs = useRef([]);

  // Countdown once OTP step starts
  useEffect(() => {
    if (step !== 'otp') return;
    setTimer(OTP_EXPIRY);
    setCanResend(false);
    const id = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const sendOtp = async () => {
    setSending(true);
    setError('');
    try {
      await ownerAPI.requestActionOtp();
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    setError('');
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...otp]; next[i] = ''; setOtp(next);
      if (!otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const verify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setRunning(true);
    setError('');
    try {
      await ownerAPI.verifyActionOtp(code);
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid OTP. Please try again.');
      setRunning(false);
      return;
    }
    // OTP verified — now execute the destructive action
    try {
      setStep('confirmed');
      await onConfirmed();
      onClose();
    } catch (e) {
      setStep('otp'); // revert to OTP step so user can see the error
      setError(e.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const inp = {
    width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800,
    border: '2px solid #e2e8f0', borderRadius: 10, outline: 'none',
    fontFamily: 'monospace', color: '#1a202c', background: '#fff',
    transition: 'border-color 0.15s',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 28px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-icons" style={{ color: '#fff', fontSize: 22 }}>delete_forever</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>Requires email OTP verification</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '22px 24px' }}>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Step: warn — show what will be deleted */}
          {step === 'warn' && (
            <>
              <div style={{ background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                {description}
              </div>
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20, lineHeight: 1.6 }}>
                <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 5 }}>lock</span>
                This action is irreversible. You will need to verify your identity with a <strong>6-digit OTP</strong> sent to your email before proceeding.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={sendOtp} disabled={sending} style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: sending ? 0.7 : 1 }}>
                  {sending
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Sending OTP…</>
                    : <><span className="material-icons" style={{ fontSize: 16 }}>send</span>Send OTP to my email</>}
                </button>
              </div>
            </>
          )}

          {/* Step: otp — enter code */}
          {step === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 14, color: '#374151', fontWeight: 600, marginBottom: 4 }}>Enter the 6-digit OTP sent to your email</div>
                {!canResend && (
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span className="material-icons" style={{ fontSize: 13 }}>timer</span>
                    Expires in {fmt(timer)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text" inputMode="numeric"
                    value={digit} maxLength={1}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    style={{ ...inp, borderColor: digit ? '#dc2626' : '#e2e8f0' }}
                  />
                ))}
              </div>

              {canResend && (
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <button onClick={sendOtp} disabled={sending} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                    Resend OTP
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={verify} disabled={running || otp.join('').length < 6} style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: (running || otp.join('').length < 6) ? 'not-allowed' : 'pointer', opacity: (running || otp.join('').length < 6) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {running
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Verifying…</>
                    : <><span className="material-icons" style={{ fontSize: 16 }}>verified</span>Verify & Delete</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
