// ==============================================================================
// LA ESFERA HRMS - AI ASSISTANT CHATBOT (HRMSChatbot.jsx)
// Path: Frontend/hrms-frontend/src/components/Chatbot/HRMSChatbot.jsx
// Features:
//   1. Real-time HR DB answers (Leave balances, Today's attendance, Manager, Profile).
//   2. Action-Oriented AI: Interactive Leave Application cards (Draft -> 1-Click Submit).
//   3. Voice-to-Text (Web Speech API) & Multilingual Support (English, Hindi, Marathi).
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Languages,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { getApiUrl } from '../../services/apiClient';
import './HRMSChatbot.css';

const LANGUAGES = [
  { code: 'en', label: 'EN', fullLabel: 'English', speechCode: 'en-IN' },
  { code: 'hi', label: 'HI', fullLabel: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'mr', label: 'MR', fullLabel: 'मराठी', speechCode: 'mr-IN' }
];

export default function HRMSChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Read current user
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const firstName = user.first_name || user.firstName || (user.name ? user.name.split(' ')[0] : 'there');

  // Greeting based on language
  const getInitialGreeting = (lang) => {
    if (lang === 'hi') {
      return {
        text: `👋 नमस्ते **${firstName}**! मैं आपका **LA ESFERA HR AI Assistant** हूँ।\n\nआप मुझसे अपने **लीव बैलेंस**, **आज की उपस्थिति**, **मॅनेजर**, या सीधे **छुट्टी का आवेदन** करने के लिए कह सकते हैं!`,
        suggestions: [
          'कल के लिए casual leave apply करो',
          'मेरी कितनी छुट्टियां बची हैं?',
          'क्या आज पंच-इन हुआ?',
          'मेरा रिपोर्टिंग मैनेजर कौन है?'
        ]
      };
    }
    if (lang === 'mr') {
      return {
        text: `👋 नमस्कार **${firstName}**! मी तुमचा **LA ESFERA HR AI Assistant** आहे.\n\nतुम्ही मला तुमच्या **शिल्लक सुट्ट्या**, **आजची हजेरी**, **मॅनेजर**, किंवा थेट **रजा अर्ज** करण्यासाठी सांगू शकता!`,
        suggestions: [
          'उद्यासाठी 1 दिवसाची सुट्टी द्या',
          'माझ्या किती सुट्ट्या शिल्लक आहेत?',
          'आजचे पंच-इन झाले का?',
          'पुढील सणांच्या सुट्ट्या दाखवा'
        ]
      };
    }
    return {
      text: `👋 Hello **${firstName}**! I am your **LA ESFERA HR AI Assistant**.\n\nYou can ask about your **leave balances**, **today's punch status**, **reporting manager**, or even **apply for leaves directly** here!`,
      suggestions: [
        'Apply 1 day casual leave for tomorrow',
        'How many leaves have I taken?',
        'Did I punch in today?',
        'Who is my manager?'
      ]
    };
  };

  const [messages, setMessages] = useState(() => {
    const init = getInitialGreeting('en');
    return [
      {
        id: 1,
        sender: 'bot',
        text: init.text,
        suggestions: init.suggestions
      }
    ];
  });

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Web Speech API initialization failed:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Update speech recognition language when selectedLang changes
  useEffect(() => {
    if (recognitionRef.current) {
      const found = LANGUAGES.find(l => l.code === selectedLang);
      recognitionRef.current.lang = found ? found.speechCode : 'en-IN';
    }
  }, [selectedLang]);

  // Don't render on public auth screens
  const isAuthPage = ['/login', '/forgot-password', '/set-password', '/reset-password'].some(p =>
    location.pathname.startsWith(p)
  );

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (isAuthPage || !token) {
    return null;
  }

  // Toggle Voice Input
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        const found = LANGUAGES.find(l => l.code === selectedLang);
        recognitionRef.current.lang = found ? found.speechCode : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  // Switch Language
  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    const greeting = getInitialGreeting(langCode);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'bot',
        text: greeting.text,
        suggestions: greeting.suggestions
      }
    ]);
  };

  // Send Chat Message
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const endpoint = getApiUrl('/api/v1/chatbot/query');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: query,
          lang: selectedLang
        })
      });

      if (!res.ok) {
        throw new Error('Chatbot service unavailable');
      }

      const data = await res.json();
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'I processed your request.',
        action: data.action || null,
        draft: data.draft || null,
        status: data.action ? 'draft' : undefined,
        suggestions: data.suggestions || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: '⚠️ I encountered an issue connecting to the HR records. Please verify your connection or try again.',
          suggestions: ['How many leaves have I taken?', 'Did I punch in today?']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Execute Leave Confirmation Action
  const handleConfirmLeave = async (msgId, draft) => {
    setActionLoadingId(msgId);
    try {
      const endpoint = getApiUrl('/api/v1/chatbot/execute-action');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'apply_leave',
          draft: draft
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Mark message draft as submitted
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId ? { ...m, status: 'submitted', leaveId: data.leave_id } : m
          )
        );

        // Append bot confirmation message
        setMessages(prev => [
          ...prev,
          {
            id: Date.now(),
            sender: 'bot',
            text: data.reply || `🎉 **Leave Application #${data.leave_id} Submitted Successfully!**\nYour manager has been notified for approval.`,
            suggestions: ['How many leaves have I taken?', 'Upcoming holidays']
          }
        ]);
      } else {
        alert(data.error || 'Failed to submit leave. Please try again or apply from the Leave tab.');
      }
    } catch (err) {
      alert('Network error while submitting leave. Please check your connection.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Leave Draft
  const handleCancelLeave = (msgId) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId ? { ...m, status: 'cancelled' } : m
      )
    );
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'bot',
        text: '❌ Leave request cancelled. Let me know if you would like to apply for another date or check your balance!',
        suggestions: ['How many leaves have I taken?', 'Apply leave for tomorrow']
      }
    ]);
  };

  // Quick markdown bold & bullet formatter
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    return txt.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} className="chatbot-code-tag">{part.slice(1, -1)}</code>;
        }
        return part;
      });

      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <div key={idx} className="chatbot-bullet-line">{parts}</div>;
      }
      if (line.startsWith('### ')) {
        return <div key={idx} className="chatbot-heading-line">{parts}</div>;
      }
      return <div key={idx} className="chatbot-text-line">{parts}</div>;
    });
  };

  return (
    <div className="hrms-chatbot-container">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          className="hrms-chatbot-trigger-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open HR AI Assistant"
        >
          <div className="chatbot-pulse-dot" />
          <Sparkles size={18} className="chatbot-sparkle-icon" />
          <span className="chatbot-trigger-label">Ask HR AI</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="hrms-chatbot-window" role="dialog" aria-label="HR AI Chat Assistant">
          {/* Header */}
          <div className="hrms-chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar-badge">
                <Bot size={20} />
              </div>
              <div className="chatbot-header-info">
                <div className="chatbot-header-title">LA ESFERA HR AI</div>
                <span className="chatbot-online-indicator">
                  <span className="online-green-dot" /> Online • Realtime DB
                </span>
              </div>
            </div>

            {/* Language Switcher & Close Button */}
            <div className="chatbot-header-actions">
              <div className="chatbot-lang-pills" role="group" aria-label="Select Language" title="Select Chat Language">
                <Languages size={13} className="chatbot-lang-icon" />
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`chatbot-lang-pill ${selectedLang === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    title={lang.fullLabel}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="chatbot-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="hrms-chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chatbot-msg-row chatbot-msg-${m.sender}`}>
                {m.sender === 'bot' && (
                  <div className="chatbot-bot-avatar">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="chatbot-bubble">
                  {renderFormattedText(m.text)}

                  {/* ACTION CARD: Leave Application Confirmation */}
                  {m.action === 'confirm_leave_application' && m.draft && (
                    <div className="chatbot-action-card">
                      <div className="chatbot-card-header">
                        <FileText size={16} className="chatbot-card-icon" />
                        <span className="chatbot-card-title">Leave Application Draft</span>
                        <span className="chatbot-badge-category">{m.draft.category}</span>
                      </div>

                      <div className="chatbot-card-body">
                        <div className="chatbot-card-row">
                          <Calendar size={14} className="chatbot-row-icon" />
                          <span className="chatbot-row-label">Dates:</span>
                          <span className="chatbot-row-val">
                            <strong>{m.draft.start_date}</strong> to <strong>{m.draft.end_date}</strong>
                          </span>
                        </div>
                        <div className="chatbot-card-row">
                          <Clock size={14} className="chatbot-row-icon" />
                          <span className="chatbot-row-label">Duration:</span>
                          <span className="chatbot-row-val">{m.draft.total_days} Day(s)</span>
                        </div>
                        <div className="chatbot-card-row">
                          <UserCheck size={14} className="chatbot-row-icon" />
                          <span className="chatbot-row-label">Reason:</span>
                          <span className="chatbot-row-val">{m.draft.reason}</span>
                        </div>
                        <div className="chatbot-card-row chatbot-bal-row">
                          <span className="chatbot-row-label">Available Balance:</span>
                          <span className="chatbot-badge-bal">{m.draft.available_balance || 0} days</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      {m.status === 'draft' && (
                        <div className="chatbot-card-actions">
                          <button
                            type="button"
                            className="chatbot-btn-confirm"
                            onClick={() => handleConfirmLeave(m.id, m.draft)}
                            disabled={actionLoadingId === m.id}
                          >
                            {actionLoadingId === m.id ? (
                              'Submitting...'
                            ) : (
                              <>
                                <CheckCircle2 size={14} /> Confirm & Apply
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="chatbot-btn-cancel"
                            onClick={() => handleCancelLeave(m.id)}
                            disabled={actionLoadingId === m.id}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {m.status === 'submitted' && (
                        <div className="chatbot-card-status-success">
                          <CheckCircle2 size={16} /> Submitted #{m.leaveId || 'OK'} • Pending Approval
                        </div>
                      )}

                      {m.status === 'cancelled' && (
                        <div className="chatbot-card-status-cancelled">
                          <AlertCircle size={14} /> Request Cancelled
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions Chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="chatbot-suggestions-wrapper">
                      {m.suggestions.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="chatbot-chip-btn"
                          onClick={() => handleSendMessage(s)}
                          disabled={loading}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-msg-row chatbot-msg-bot">
                <div className="chatbot-bot-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="chatbot-bubble chatbot-typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-text">Checking HR records...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Listening Banner */}
          {isListening && (
            <div className="chatbot-listening-banner">
              <span className="chatbot-mic-pulse" />
              <span>
                Listening in <strong>{LANGUAGES.find(l => l.code === selectedLang)?.label}</strong>... Speak now!
              </span>
            </div>
          )}

          {/* Input Bar */}
          <form
            className="hrms-chatbot-footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="chatbot-input-field"
              placeholder={
                isListening
                  ? 'Listening...'
                  : selectedLang === 'hi'
                  ? 'पूछें: छुट्टी, आज का पंच, मॅनेजर...'
                  : selectedLang === 'mr'
                  ? 'विचारा: सुट्ट्या, हजेरी, मॅनेजर...'
                  : 'Ask about leaves, punch, manager or apply leave...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />

            {/* Microphone Voice Button */}
            {speechSupported && (
              <button
                type="button"
                className={`chatbot-mic-btn ${isListening ? 'active-listening' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop Listening' : `Voice Input (${LANGUAGES.find(l => l.code === selectedLang)?.label})`}
                aria-label="Voice input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={!input.trim() || loading}
              aria-label="Send Message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
