import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { 
  FiMessageSquare, 
  FiPlus, 
  FiTrash2, 
  FiActivity, 
  FiDatabase, 
  FiSend, 
  FiAlertCircle, 
  FiTrendingUp, 
  FiZap, 
  FiPieChart, 
  FiCpu, 
  FiStar,
  FiShoppingBag,
  FiHelpCircle
} from 'react-icons/fi';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I am your Intelligent Restaurant Knowledge & Operations Assistant powered by **Google Gemini AI** and **ChromaDB Vector Retrieval**.\n\nHow can I help you optimize restaurant operations, menu items, or food waste today?',
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await aiAPI.history({ page: 1, per_page: 10 });
      if (res.data?.logs) {
        setHistory(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch AI chat history', err);
    }
  };

  const handleSend = async (questionText) => {
    const query = typeof questionText === 'string' ? questionText : input;
    if (!query.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (typeof questionText !== 'string') setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chat({ question: query.trim() });
      const data = res.data;

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        modelUsed: data.model_used,
        responseTime: data.response_time_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMessage]);
      fetchHistory();
    } catch (err) {
      console.error('AI CHAT ERROR');
      console.error('URL:', err.config?.url || 'Unknown URL');
      console.error('Status:', err.response?.status || 'Network Error');
      console.error('Response:', err.response?.data || err.message);
      console.error('Message:', err.message);
      
      toast.error('Failed to get answer from AI Assistant');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: '⚠️ I encountered an error connecting to the AI engine. Please verify your connection or try again.',
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: 'assistant',
        content: 'Starting a new conversation. Ask me anything about restaurant operations, food waste mitigation, or customer insights!',
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const samplePrompts = [
    {
      category: 'Waste Management',
      icon: <FiAlertCircle />,
      text: 'How can we reduce food waste today?',
      color: '#ef4444'
    },
    {
      category: 'Analytics & Sales',
      icon: <FiTrendingUp />,
      text: 'What menu items are performing best?',
      color: '#10b981'
    },
    {
      category: 'Inventory Optimization',
      icon: <FiPieChart />,
      text: 'Which ingredients are running low on stock?',
      color: '#f59e0b'
    },
    {
      category: 'Customer Sentiment',
      icon: <FiStar />,
      text: 'Summarize customer review sentiment.',
      color: '#3b82f6'
    }
  ];

  return (
    <div className="fade-in" style={{ height: '100%' }}>
      {/* 3-Column Layout Container */}
      <div className="ai-layout">
        
        {/* LEFT SIDEBAR */}
        <div className="ai-sidebar card" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <div className="ai-sidebar-header" style={{ padding: 'var(--space-4) 0' }}>
            <div className="ai-avatar-container" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div className="ai-avatar" style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #f97316 0%, #d97706 100%)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)'
              }}>
                <FiCpu style={{ fontSize: '20px' }} />
              </div>
              <div className="ai-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Gemini Core</span>
                <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="status-dot" style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></span> Online & Ready
                </span>
              </div>
            </div>
            <button className="btn btn-primary btn-block btn-sm mt-4" onClick={handleNewChat} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600',
              boxShadow: 'var(--shadow-primary)'
            }}>
              <FiPlus /> New Session
            </button>
          </div>
          
          <div className="ai-sidebar-content" style={{ padding: 'var(--space-2) 0' }}>
            <h4 className="sidebar-section-title" style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-muted)',
              marginBottom: '12px',
              fontWeight: '700'
            }}>Prompt History</h4>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="history-empty" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px', padding: '10px' }}>
                  No recent prompt logs.
                </div>
              ) : (
                history.map((log) => (
                  <div className="history-item" key={log.id} onClick={() => handleSend(log.question)} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}>
                    <FiMessageSquare className="history-icon" style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
                    <span className="history-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.question}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="ai-sidebar-footer" style={{ padding: 'var(--space-3) 0 0' }}>
            <button className="btn btn-ghost btn-block btn-sm" onClick={handleClearChat} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'var(--text-secondary)'
            }}>
              <FiTrash2 /> Reset Chat Interface
            </button>
          </div>
        </div>

        {/* MIDDLE MAIN CHAT AREA */}
        <div className="ai-main card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          
          <div className="ai-main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '16px 24px' }}>
            <div>
              <h2 className="ai-header-title" style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiZap style={{ color: '#f97316' }} /> Operations Intelligence Hub
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Query system metrics, reviews, and logs using Gemini LLM</span>
            </div>
            <div className="ai-header-badges" style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiActivity /> System Live
              </span>
              <span className="badge badge-primary" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiDatabase /> Vector DB: Active
              </span>
            </div>
          </div>

          {/* CHAT BUBBLE AREA */}
          <div className="ai-chat-area" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <FiMessageSquare style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                <p>Send a prompt or select a template below to begin analysis.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    maxWidth: '85%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}>
                    {msg.role === 'assistant' ? (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        flexShrink: 0,
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)'
                      }}>
                        AI
                      </div>
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        flexShrink: 0,
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                      }}>
                        ME
                      </div>
                    )}
                    
                    <div style={{
                      background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-card)',
                      color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                      padding: '16px 20px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                      lineHeight: '1.6',
                      fontSize: '14.5px'
                    }}>
                      <div className="markdown-body" style={{ color: msg.role === 'user' ? '#ffffff' : 'inherit' }}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="ai-sources" style={{
                          marginTop: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle)'
                        }}>
                          <div className="ai-sources-title" style={{ fontSize: '11px', fontWeight: 'bold', color: msg.role === 'user' ? '#e2e8f0' : 'var(--color-primary-light)', marginBottom: '6px' }}>
                            Retrieved Sources ({msg.sources.length})
                          </div>
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="ai-source-item" style={{
                              background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'var(--bg-input)',
                              color: msg.role === 'user' ? '#f1f5f9' : 'var(--text-secondary)',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              marginBottom: '4px'
                            }}>{src.text}</div>
                          ))}
                        </div>
                      )}

                      <div className="ai-message-meta" style={{
                        fontSize: '10px',
                        color: msg.role === 'user' ? '#e2e8f0' : 'var(--text-muted)',
                        marginTop: '8px',
                        textAlign: 'right'
                      }}>
                        {msg.timestamp} {msg.modelUsed && `• ${msg.modelUsed} (${msg.responseTime}ms)`}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '85%' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  AI
                </div>
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '16px 20px',
                  borderRadius: '18px 18px 18px 4px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div className="typing-indicator" style={{ display: 'flex', gap: '4px' }}>
                    <span className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }}></span>
                    <span className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }}></span>
                    <span className="typing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-secondary)', display: 'inline-block' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* QUICK PROMPT OPTIONS */}
          {messages.length <= 1 && (
            <div style={{ padding: '0 24px 16px', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>Suggested Operations Analytics Prompts:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {samplePrompts.map((prompt, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSend(prompt.text)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ color: prompt.color, fontSize: '18px', marginTop: '2px' }}>{prompt.icon}</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{prompt.category}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.4' }}>{prompt.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INPUT BAR */}
          <div className="ai-input-wrapper" style={{ padding: '16px 24px', display: 'flex', gap: '12px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', alignItems: 'center' }}>
            <textarea
              className="ai-input"
              rows="1"
              placeholder="Ask me a question (e.g., 'What is our average menu rating?', 'Show low stock ingredients')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              style={{
                flex: 1,
                borderRadius: '24px',
                padding: '12px 20px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                fontSize: '14px'
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0
              }}
            >
              <FiSend style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>

        {/* RIGHT INSIGHTS PANEL */}
        <div className="ai-insights card" style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-subtle)', padding: '24px' }}>
          <h3 className="insights-title" style={{ fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <FiActivity style={{ color: 'var(--color-primary)' }} /> Live Ops Intelligence
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="insight-card" style={{ borderLeft: '4px solid #10b981', padding: '12px 16px' }}>
              <div className="insight-header text-success" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                <FiTrendingUp /> Revenue Analytics
              </div>
              <div className="insight-body" style={{ fontSize: '12.5px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Seeded Sales trend: <strong>₹52,439.10 today</strong> (11 orders active). Average basket value is stable.
              </div>
            </div>
            
            <div className="insight-card" style={{ borderLeft: '4px solid #ef4444', padding: '12px 16px' }}>
              <div className="insight-header text-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                <FiAlertCircle /> Spoilage & Food Waste
              </div>
              <div className="insight-body" style={{ fontSize: '12.5px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Logged Waste today: <strong>10.1 kg</strong>. Cost impact of ingredients waste totals over ₹2,400 this week.
              </div>
            </div>
            
            <div className="insight-card" style={{ borderLeft: '4px solid #f59e0b', padding: '12px 16px' }}>
              <div className="insight-header text-warning" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                <FiAlertCircle /> Reorder Level Alerts
              </div>
              <div className="insight-body" style={{ fontSize: '12.5px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Avocados and Truffle Oil are currently below the critical reorder threshold. Stock level is under 15%.
              </div>
            </div>
            
            <div className="insight-card" style={{ borderLeft: '4px solid #3b82f6', padding: '12px 16px' }}>
              <div className="insight-header text-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                <FiStar /> Review Sentiment Analysis
              </div>
              <div className="insight-body" style={{ fontSize: '12.5px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Sentiment scores are running at <strong>82% positive</strong>. Review processing is live connected to database logs.
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <FiHelpCircle style={{ fontSize: '24px', color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Need Operations Help?</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              Ask the assistant for recipe ratios, inventory audits, or staff allocations to optimize efficiency.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
