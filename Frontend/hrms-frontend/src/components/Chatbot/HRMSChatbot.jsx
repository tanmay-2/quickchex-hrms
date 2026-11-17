// ==============================================================================
// LA ESFERA HRMS - AI ASSISTANT CHATBOT (HRMSChatbot.jsx)
// Path: Frontend/hrms-frontend/src/components/Chatbot/HRMSChatbot.jsx
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../../services/apiClient';
import './HRMSChatbot.css';

export default function HRMSChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `👋 Hello ${firstName}! I am your **LA ESFERA HR Assistant**.\n\nYou can ask me questions about your **leave balances**, **today's punch status**, **reporting manager**, or **company policies**!`,
      suggestions: [
        'How many leaves have I taken?',
        'Did I punch in today?',
        'Who is my manager?',
        'Upcoming holidays'
      ]
    }
  ]);

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

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

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
        body: JSON.stringify({ message: query })
      });

      if (!res.ok) {
        throw new Error('Chatbot service unavailable');
      }

      const data = await res.json();
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'I processed your request, but received no content.',
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

  // Quick markdown bold & bullet formatter
  const renderFormattedText = (txt) => {
    if (!txt) return null;
    return txt.split('\n').map((line, idx) => {
      // Bold replacer
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
                <h3>LA ESFERA HR Assistant</h3>
                <span className="chatbot-online-indicator">
                  <span className="online-green-dot" /> Online • Realtime Database
                </span>
              </div>
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
              placeholder="Ask about leaves, attendance, manager..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
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
