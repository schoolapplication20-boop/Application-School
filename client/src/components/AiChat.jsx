import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './AiChat.css';

const WELCOME = "Hi! 👋 I'm your My-Skoolz AI assistant.\n\nI can help with school-related queries. Click a topic below or type your question!";

const QUICK_ACTIONS = [
  { label: '📋 Admissions',      message: 'admissions' },
  { label: '💰 Fees',            message: 'fees' },
  { label: '📅 Attendance',      message: 'attendance' },
  { label: '📊 Results',         message: 'results' },
  { label: '📚 Homework',        message: 'homework' },
  { label: '🚌 Transport',       message: 'transport' },
  { label: '🕐 Timetable',       message: 'timetable' },
  { label: '🏖️ Leave Request',   message: 'leave request' },
  { label: '📞 Contact Support', message: 'contact support' },
  { label: '🔐 Login Help',      message: 'login help' },
];

const AiChat = () => {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'bot', text: WELCOME, source: 'faq' }
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const buildHistory = (msgs) =>
    msgs
      .slice(1, -1)  // drop welcome message and the just-added user message (sent separately)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const updatedMsgs = [...messages, { role: 'user', text: trimmed }];
    setMessages(updatedMsgs);
    setInput('');
    setShowQuick(false);
    setLoading(true);

    try {
      const res = await api.post('/api/chat', {
        message: trimmed,
        history: buildHistory(updatedMsgs),
      });
      const payload = res.data?.data;
      const reply  = payload?.reply  ?? "Sorry, I couldn't get a response. Please try again.";
      const source = payload?.source ?? 'faq';
      setMessages(prev => [...prev, { role: 'bot', text: reply, source }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "Something went wrong. Please check your connection and try again.",
        source: 'error',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'bot', text: WELCOME, source: 'faq' }]);
    setShowQuick(true);
    setInput('');
  };

  return (
    <>
      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="My-Skoolz AI Assistant"
      >
        {open ? '✕' : '💬'}
        {!open && <span className="ai-fab__label">My-Skoolz AI</span>}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-panel__header">
            <div className="ai-panel__header-left">
              <div className="ai-panel__avatar">🤖</div>
              <div>
                <div className="ai-panel__title">My-Skoolz AI</div>
                <div className="ai-panel__subtitle">School Assistant • Online</div>
              </div>
            </div>
            <button className="ai-panel__clear" onClick={clearChat} title="Clear chat">↺</button>
          </div>

          <div className="ai-panel__messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role} ${m.error ? 'ai-msg--error' : ''}`}>
                {m.role === 'bot' && <div className="ai-msg__avatar">🤖</div>}
                <div className="ai-msg__bubble-wrap">
                  <div className="ai-msg__bubble">
                    {m.text.split('\n').map((line, j, arr) => (
                      <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                    ))}
                  </div>
                  {m.role === 'bot' && m.source === 'gemini' && (
                    <span className="ai-msg__gemini-badge">✦ AI-powered</span>
                  )}
                </div>
              </div>
            ))}

            {showQuick && !loading && (
              <div className="ai-quick-actions">
                <p className="ai-quick-label">Choose a topic:</p>
                <div className="ai-quick-grid">
                  {QUICK_ACTIONS.map((action, i) => (
                    <button
                      key={i}
                      className="ai-quick-btn"
                      onClick={() => sendMessage(action.message)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showQuick && !loading && (
              <button className="ai-topics-btn" onClick={() => setShowQuick(true)}>
                📂 Browse Topics
              </button>
            )}

            {loading && (
              <div className="ai-msg ai-msg--bot">
                <div className="ai-msg__avatar">🤖</div>
                <div className="ai-msg__bubble ai-msg__bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="ai-panel__input-row">
            <textarea
              ref={inputRef}
              className="ai-panel__input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question..."
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-panel__send"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>
          <div className="ai-panel__footer">
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      )}
    </>
  );
};

export default AiChat;
