import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';
import './AiChat.css';

/* ── i18n ────────────────────────────────────────────────────────── */
const I18N = {
  en: {
    welcome: "Hi! 👋 I'm **My-Skoolz AI**, powered by ChatGPT.\n\nAsk me anything — school questions, homework help, general knowledge, or choose a quick topic below.",
    subtitle: 'AI Assistant • Online',
    chooseTopic: 'Quick topics:',
    browseTopics: '📂 Browse Topics',
    placeholder: 'Ask me anything...',
    footer: 'Enter to send · Shift+Enter for new line',
    newChat: '+ New',
    quickActions: [
      { label: '📋 Admissions',      message: 'Tell me about the admissions process' },
      { label: '💰 Fees',            message: 'What are the fee details and payment process?' },
      { label: '📅 Attendance',      message: 'How does attendance work?' },
      { label: '📊 Results',         message: 'How can I check my results?' },
      { label: '📚 Homework',        message: 'Help me with homework' },
      { label: '🚌 Transport',       message: 'Tell me about school transport' },
      { label: '🕐 Timetable',       message: 'How can I view my timetable?' },
      { label: '🏖️ Leave Request',   message: 'How do I apply for leave?' },
      { label: '📞 Contact Support', message: 'How do I contact school support?' },
      { label: '🔐 Login Help',      message: 'I need help with login' },
    ],
  },
  hi: {
    welcome: "नमस्ते! 👋 मैं **My-Skoolz AI** हूँ, ChatGPT द्वारा संचालित।\n\nकुछ भी पूछें — स्कूल प्रश्न, होमवर्क सहायता, सामान्य ज्ञान, या नीचे एक त्वरित विषय चुनें।",
    subtitle: 'AI सहायक • ऑनलाइन',
    chooseTopic: 'त्वरित विषय:',
    browseTopics: '📂 विषय देखें',
    placeholder: 'कुछ भी पूछें...',
    footer: 'Enter से भेजें · Shift+Enter नई लाइन',
    newChat: '+ नया',
    quickActions: [
      { label: '📋 प्रवेश',         message: 'प्रवेश प्रक्रिया के बारे में बताएं' },
      { label: '💰 शुल्क',          message: 'शुल्क विवरण और भुगतान प्रक्रिया क्या है?' },
      { label: '📅 उपस्थिति',       message: 'उपस्थिति कैसे काम करती है?' },
      { label: '📊 परिणाम',         message: 'मैं अपना परिणाम कैसे देख सकता हूँ?' },
      { label: '📚 गृहकार्य',       message: 'होमवर्क में मेरी मदद करें' },
      { label: '🚌 परिवहन',         message: 'स्कूल परिवहन के बारे में बताएं' },
      { label: '🕐 समय-सारणी',      message: 'मैं अपना समय-सारणी कैसे देखूं?' },
      { label: '🏖️ छुट्टी अनुरोध', message: 'मैं छुट्टी के लिए कैसे आवेदन करूं?' },
      { label: '📞 सहायता संपर्क',  message: 'मैं स्कूल सहायता से कैसे संपर्क करूं?' },
      { label: '🔐 लॉगिन सहायता',  message: 'लॉगिन में मुझे मदद चाहिए' },
    ],
  },
  te: {
    welcome: "నమస్కారం! 👋 నేను **My-Skoolz AI**, ChatGPT ద్వారా నడుస్తున్నాను.\n\nఏదైనా అడగండి — పాఠశాల ప్రశ్నలు, హోంవర్క్ సహాయం, సాధారణ జ్ఞానం, లేదా దిగువ విషయాన్ని ఎంచుకోండి.",
    subtitle: 'AI సహాయకుడు • ఆన్‌లైన్',
    chooseTopic: 'త్వరిత విషయాలు:',
    browseTopics: '📂 విషయాలు చూడండి',
    placeholder: 'ఏదైనా అడగండి...',
    footer: 'పంపడానికి Enter · కొత్త వరుసకు Shift+Enter',
    newChat: '+ కొత్తది',
    quickActions: [
      { label: '📋 అడ్మిషన్లు',       message: 'అడ్మిషన్ ప్రక్రియ గురించి చెప్పండి' },
      { label: '💰 ఫీజులు',           message: 'ఫీజు వివరాలు మరియు చెల్లింపు ప్రక్రియ ఏమిటి?' },
      { label: '📅 హాజరు',            message: 'హాజరు ఎలా పని చేస్తుంది?' },
      { label: '📊 ఫలితాలు',          message: 'నా ఫలితాలు ఎలా చూడాలి?' },
      { label: '📚 హోంవర్క్',         message: 'హోంవర్క్‌లో నాకు సహాయపడండి' },
      { label: '🚌 రవాణా',            message: 'పాఠశాల రవాణా గురించి చెప్పండి' },
      { label: '🕐 సమయపట్టిక',       message: 'నా సమయపట్టిక ఎలా చూడాలి?' },
      { label: '🏖️ సెలవు అభ్యర్థన', message: 'సెలవు కోసం ఎలా దరఖాస్తు చేయాలి?' },
      { label: '📞 సంప్రదింపు',       message: 'పాఠశాల సహాయతను ఎలా సంప్రదించాలి?' },
      { label: '🔐 లాగిన్ సహాయం',    message: 'లాగిన్‌లో నాకు సహాయం కావాలి' },
    ],
  },
};

const LANG_OPTIONS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
];

/* ── Simple markdown renderer ────────────────────────────────────── */
function renderMd(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h5 key={i} className="ai-md-h3">{inlineMd(line.slice(4))}</h5>);
    } else if (line.startsWith('## ')) {
      elements.push(<h4 key={i} className="ai-md-h2">{inlineMd(line.slice(3))}</h4>);
    } else if (line.startsWith('# ')) {
      elements.push(<h3 key={i} className="ai-md-h1">{inlineMd(line.slice(2))}</h3>);
    } else if (/^[-•] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-•] /.test(lines[i])) {
        items.push(<li key={i}>{inlineMd(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="ai-md-ul">{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{inlineMd(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="ai-md-ol">{items}</ol>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="ai-md-spacer" />);
    } else {
      elements.push(<p key={i} className="ai-md-p">{inlineMd(line)}</p>);
    }
    i++;
  }
  return elements;
}

function inlineMd(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="ai-md-code">{part.slice(1, -1)}</code>;
    return part;
  });
}

/* ── Component ───────────────────────────────────────────────────── */
const AiChat = () => {
  const [open, setOpen]           = useState(false);
  const [lang, setLang]           = useState('en');
  const [sessions, setSessions]   = useState([]);
  const [activeId, setActiveId]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const sessTabRef = useRef(null);

  const t = I18N[lang];

  const welcomeMsg = useCallback(
    (l) => ({ role: 'bot', text: (I18N[l] || I18N.en).welcome }),
    []
  );

  /* scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  /* load sessions on first open */
  useEffect(() => {
    if (!open || initialized) return;
    setInitialized(true);
    loadSessions();
  }, [open]);

  /* load messages when active session changes */
  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  /* scroll session tabs to active */
  useEffect(() => {
    const el = sessTabRef.current?.querySelector('.ai-sess-tab--active');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  const loadSessions = async () => {
    try {
      const res = await api.get('/api/ai/sessions');
      const data = res.data?.data || [];
      setSessions(data);
      if (data.length > 0) {
        setActiveId(data[0].id);
      } else {
        setMessages([welcomeMsg(lang)]);
        setShowQuick(true);
      }
    } catch {
      setMessages([welcomeMsg(lang)]);
      setShowQuick(true);
    }
  };

  const loadMessages = async (sessionId) => {
    setHistLoading(true);
    try {
      const res = await api.get(`/api/ai/sessions/${sessionId}/messages`);
      const msgs = (res.data?.data || []).map(m => ({
        role: m.role === 'user' ? 'user' : 'bot',
        text: m.content,
      }));
      if (msgs.length === 0) {
        setMessages([welcomeMsg(lang)]);
        setShowQuick(true);
      } else {
        setMessages(msgs);
        setShowQuick(false);
      }
    } catch {
      setMessages([welcomeMsg(lang)]);
      setShowQuick(true);
    } finally {
      setHistLoading(false);
    }
  };

  const createSession = async (l = lang) => {
    const res = await api.post(`/api/ai/sessions?lang=${l}`);
    const s = res.data?.data;
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
    setMessages([welcomeMsg(l)]);
    setShowQuick(true);
    setInput('');
    return s.id;
  };

  const handleNewChat = async () => {
    try { await createSession(); } catch { /* ignore */ }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/ai/sessions/${sessionId}`);
      setSessions(prev => {
        const next = prev.filter(s => s.id !== sessionId);
        if (activeId === sessionId) {
          if (next.length > 0) {
            setActiveId(next[0].id);
          } else {
            setActiveId(null);
            setMessages([welcomeMsg(lang)]);
            setShowQuick(true);
          }
        }
        return next;
      });
    } catch { /* ignore */ }
  };

  /* word-by-word typing animation */
  const animateTyping = useCallback((fullText) => {
    return new Promise(resolve => {
      const words = fullText.split(' ');
      let idx = 0;
      setMessages(prev => [...prev, { role: 'bot', text: '', animating: true }]);
      const tick = setInterval(() => {
        idx += 3;
        const partial = words.slice(0, idx).join(' ');
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'bot', text: partial, animating: true };
          return copy;
        });
        if (idx >= words.length) {
          clearInterval(tick);
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'bot', text: fullText };
            return copy;
          });
          resolve();
        }
      }, 40);
    });
  }, []);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setShowQuick(false);
    setLoading(true);

    try {
      let sid = activeId;
      if (!sid) sid = await createSession();

      const res = await api.post(`/api/ai/sessions/${sid}/messages`, {
        message: trimmed,
        lang,
      });
      const reply = res.data?.data?.content || "Sorry, I couldn't get a response. Please try again.";

      await animateTyping(reply);

      // Update session title in sidebar
      setSessions(prev => prev.map(s =>
        s.id === sid && s.title === 'New Chat'
          ? { ...s, title: trimmed.length > 45 ? trimmed.slice(0, 42) + '…' : trimmed }
          : s
      ));
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "Something went wrong. Please check your connection and try again.",
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const changeLang = (code) => {
    setLang(code);
    if (!activeId) {
      setMessages([welcomeMsg(code)]);
      setShowQuick(true);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="My-Skoolz AI"
      >
        {open ? '✕' : '💬'}
        {!open && <span className="ai-fab__label">My-Skoolz AI</span>}
      </button>

      {open && (
        <div className="ai-panel">

          {/* Header */}
          <div className="ai-panel__header">
            <div className="ai-panel__header-left">
              <div className="ai-panel__avatar">🤖</div>
              <div>
                <div className="ai-panel__title">My-Skoolz AI</div>
                <div className="ai-panel__subtitle">{t.subtitle}</div>
              </div>
            </div>
            <div className="ai-header-right">
              <span className="ai-powered-badge">✦ ChatGPT</span>
            </div>
          </div>

          {/* Language tab bar */}
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

          {/* Session tabs */}
          <div className="ai-sess-bar" ref={sessTabRef}>
            <button className="ai-sess-new" onClick={handleNewChat} title="New chat">
              {t.newChat}
            </button>
            {sessions.map(s => (
              <button
                key={s.id}
                className={`ai-sess-tab ${activeId === s.id ? 'ai-sess-tab--active' : ''}`}
                onClick={() => setActiveId(s.id)}
                title={s.title}
              >
                <span className="ai-sess-tab__title">{s.title}</span>
                <span
                  className="ai-sess-tab__del"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Delete"
                >✕</span>
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="ai-panel__messages">
            {histLoading ? (
              <div className="ai-hist-loading">
                <div className="ai-msg ai-msg--bot">
                  <div className="ai-msg__avatar">🤖</div>
                  <div className="ai-msg__bubble ai-msg__bubble--typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`ai-msg ai-msg--${m.role} ${m.error ? 'ai-msg--error' : ''}`}>
                    {m.role === 'bot' && <div className="ai-msg__avatar">🤖</div>}
                    <div className="ai-msg__bubble">
                      {renderMd(m.text)}
                      {m.animating && <span className="ai-cursor">▍</span>}
                    </div>
                    {m.role === 'user' && <div className="ai-msg__avatar ai-msg__avatar--user">👤</div>}
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
              </>
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
              placeholder={t.placeholder}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-panel__send"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
            >➤</button>
          </div>
          <div className="ai-panel__footer">{t.footer}</div>
        </div>
      )}
    </>
  );
};

export default AiChat;
