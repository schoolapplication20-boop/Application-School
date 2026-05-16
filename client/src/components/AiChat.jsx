import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './AiChat.css';

const I18N = {
  en: {
    welcome: "Hi! 👋 I'm your My-Skoolz AI assistant.\n\nI can help with school-related queries. Click a topic below or type your question!",
    subtitle: 'School Assistant • Online',
    chooseTopic: 'Choose a topic:',
    browseTopics: '📂 Browse Topics',
    placeholder: 'Type your question...',
    footer: 'Press Enter to send · Shift+Enter for new line',
    quickActions: [
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
    ],
  },
  hi: {
    welcome: "नमस्ते! 👋 मैं आपका My-Skoolz AI सहायक हूँ।\n\nमैं स्कूल संबंधी प्रश्नों में मदद कर सकता हूँ। नीचे एक विषय चुनें या अपना प्रश्न लिखें!",
    subtitle: 'स्कूल सहायक • ऑनलाइन',
    chooseTopic: 'एक विषय चुनें:',
    browseTopics: '📂 विषय देखें',
    placeholder: 'अपना प्रश्न लिखें...',
    footer: 'भेजने के लिए Enter दबाएं · नई लाइन के लिए Shift+Enter',
    quickActions: [
      { label: '📋 प्रवेश',         message: 'admissions' },
      { label: '💰 शुल्क',          message: 'fees' },
      { label: '📅 उपस्थिति',       message: 'attendance' },
      { label: '📊 परिणाम',         message: 'results' },
      { label: '📚 गृहकार्य',       message: 'homework' },
      { label: '🚌 परिवहन',         message: 'transport' },
      { label: '🕐 समय-सारणी',      message: 'timetable' },
      { label: '🏖️ छुट्टी अनुरोध', message: 'leave request' },
      { label: '📞 सहायता संपर्क',  message: 'contact support' },
      { label: '🔐 लॉगिन सहायता',  message: 'login help' },
    ],
  },
  te: {
    welcome: "నమస్కారం! 👋 నేను మీ My-Skoolz AI సహాయకుడిని.\n\nపాఠశాల సంబంధిత ప్రశ్నలకు నేను సహాయం చేయగలను. దిగువ విషయాన్ని ఎంచుకోండి లేదా మీ ప్రశ్న టైప్ చేయండి!",
    subtitle: 'పాఠశాల సహాయకుడు • ఆన్‌లైన్',
    chooseTopic: 'ఒక విషయాన్ని ఎంచుకోండి:',
    browseTopics: '📂 విషయాలు చూడండి',
    placeholder: 'మీ ప్రశ్న టైప్ చేయండి...',
    footer: 'పంపడానికి Enter నొక్కండి · కొత్త వరుసకు Shift+Enter',
    quickActions: [
      { label: '📋 అడ్మిషన్లు',       message: 'admissions' },
      { label: '💰 ఫీజులు',           message: 'fees' },
      { label: '📅 హాజరు',            message: 'attendance' },
      { label: '📊 ఫలితాలు',          message: 'results' },
      { label: '📚 హోంవర్క్',         message: 'homework' },
      { label: '🚌 రవాణా',            message: 'transport' },
      { label: '🕐 సమయపట్టిక',       message: 'timetable' },
      { label: '🏖️ సెలవు అభ్యర్థన', message: 'leave request' },
      { label: '📞 సంప్రదింపు',       message: 'contact support' },
      { label: '🔐 లాగిన్ సహాయం',    message: 'login help' },
    ],
  },
};

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
];

const AiChat = () => {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [lang, setLang]         = useState('en');
  const [messages, setMessages] = useState([
    { role: 'bot', text: I18N.en.welcome }
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const changeLang = (code) => {
    setLang(code);
    setMessages([{ role: 'bot', text: I18N[code].welcome }]);
    setShowQuick(true);
    setInput('');
  };

  const buildHistory = (msgs) =>
    msgs
      .filter(m => m.role === 'user' || (m.role === 'bot' && !m.error))
      .slice(-10)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const updatedMsgs = [...messages, { role: 'user', text: trimmed }];
    setMessages(updatedMsgs);
    setInput('');
    setShowQuick(false);
    setLoading(true);

    try {
      const res = await api.post('/api/chat', { message: trimmed, history: buildHistory(updatedMsgs) });
      const payload = res.data?.data;
      const reply  = payload?.reply  ?? "Sorry, I couldn't get a response. Please try again.";
      const source = payload?.source ?? 'faq';
      setMessages(prev => [...prev, { role: 'bot', text: reply, source }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "Something went wrong. Please check your connection and try again.",
        error: true
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
    setMessages([{ role: 'bot', text: I18N[lang].welcome }]);
    setShowQuick(true);
    setInput('');
  };

  const t = I18N[lang];

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
                <div className="ai-panel__subtitle">{t.subtitle}</div>
              </div>
            </div>
            <button className="ai-panel__clear" onClick={clearChat} title="Clear chat">↺</button>
          </div>

          <div className="ai-lang-bar">
            {LANG_OPTIONS.map(opt => (
              <button
                key={opt.code}
                className={`ai-lang-tab ${lang === opt.code ? 'ai-lang-tab--active' : ''}`}
                onClick={() => changeLang(opt.code)}
              >
                {opt.label}
              </button>
            ))}
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
                    <span className="ai-msg__gemini-badge">✨ Gemini AI</span>
                  )}
                </div>
              </div>
            ))}

            {showQuick && !loading && (
              <div className="ai-quick-actions">
                <p className="ai-quick-label">{t.chooseTopic}</p>
                <div className="ai-quick-grid">
                  {t.quickActions.map((action, i) => (
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
                {t.browseTopics}
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
              placeholder={t.placeholder}
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
          <div className="ai-panel__footer">{t.footer}</div>
        </div>
      )}
    </>
  );
};

export default AiChat;
