import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './AiChat.css';

const WELCOME = "Hi! I'm your My-Skoolz AI assistant. I can answer questions about your school's students, fees, teachers, and more. How can I help you?";

const AiChat = () => {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: WELCOME }
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    // Build history (exclude the welcome message for API call)
    const history = next
      .slice(1, -1)
      .map(m => ({ role: m.role, text: m.text }));

    try {
      const res = await api.post('/api/ai/chat', { message: text, history });
      const reply = res.data?.data || 'Sorry, I could not get a response.';
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'model', text: errMsg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => setMessages([{ role: 'model', text: WELCOME }]);

  return (
    <>
      {/* Floating button */}
      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
      >
        {open ? '✕' : <span className="material-icons" style={{ fontSize: 20 }}>smart_toy</span>}
        {!open && <span className="ai-fab__label">My-Skoolz AI</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-panel">
          {/* Header */}
          <div className="ai-panel__header">
            <div className="ai-panel__header-left">
              <div className="ai-panel__avatar">✦</div>
              <div>
                <div className="ai-panel__title">My-Skoolz AI</div>
                <div className="ai-panel__subtitle">Powered by Google Gemini</div>
              </div>
            </div>
            <button className="ai-panel__clear" onClick={clearChat} title="Clear chat">
              ↺
            </button>
          </div>

          {/* Messages */}
          <div className="ai-panel__messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role} ${m.error ? 'ai-msg--error' : ''}`}>
                {m.role === 'model' && (
                  <div className="ai-msg__avatar">✦</div>
                )}
                <div className="ai-msg__bubble">
                  {m.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg--model">
                <div className="ai-msg__avatar">✦</div>
                <div className="ai-msg__bubble ai-msg__bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ai-panel__input-row">
            <textarea
              ref={inputRef}
              className="ai-panel__input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about your school..."
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-panel__send"
              onClick={send}
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
