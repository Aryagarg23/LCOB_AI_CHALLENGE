'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const STEPS = {
  UPLOAD: 0,
  INTERVIEW: 1,
  ANALYZING: 2,
  RESULTS: 3
};

// Helper to extract text from v3 UIMessage (parts array)
const getMessageText = (msg) => {
  if (!msg) return '';
  if (msg.parts && Array.isArray(msg.parts)) {
    return msg.parts.filter(p => p.type === 'text').map(p => p.text).join('');
  }
  if (msg.content) return msg.content;
  return '';
};

// Markdown renderer with GFM tables support
const Md = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
);

export default function SimulatePage() {
  const [step, setStep] = useState(STEPS.UPLOAD);

  // Upload state
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [businessFiles, setBusinessFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Interview state
  const [interviewReady, setInterviewReady] = useState(false);
  const [parsedInputs, setParsedInputs] = useState(null);
  const [interviewInputText, setInterviewInputText] = useState('');
  const [followUpInputText, setFollowUpInputText] = useState('');
  const interviewChatEndRef = useRef(null);
  const followUpChatEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Analysis state
  const [agentStates, setAgentStates] = useState({});  // { agent1: { status, label, data, question } }
  const [progressBatches, setProgressBatches] = useState([]);
  const [agentQuestions, setAgentQuestions] = useState([]); // [{ agent, label, question }]
  const [result, setResult] = useState(null);
  const [streamingReport, setStreamingReport] = useState('');
  const [agentData, setAgentData] = useState(null);
  const [error, setError] = useState('');
  const [interviewTranscript, setInterviewTranscript] = useState('');

  // Post-analysis Q&A
  const [qaHistory, setQaHistory] = useState([]);

  // Build file context string for interview system prompt
  const getFileContext = () => {
    let ctx = '';
    if (imageUrls.length > 0) ctx += `The user has uploaded ${imageUrls.length} photo(s) of their business. `;
    if (businessFiles.length > 0) ctx += `The user has uploaded business files: ${businessFiles.map(f => f.name).join(', ')}. `;
    return ctx;
  };

  // Interview chat — transport carries api + body
  const interviewTransport = useMemo(() => new DefaultChatTransport({
    api: '/api/interview',
    body: { businessContext: getFileContext() },
  }), []);

  const { messages: interviewMessages, sendMessage: sendInterviewMsg, status: interviewStatus, error: interviewError } = useChat({
    id: 'interview-chat',
    transport: interviewTransport,
    onError: (err) => console.error('[Interview Chat Error]', err),
  });

  // Watch for [READY_TO_ANALYZE] — auto-transition
  useEffect(() => {
    const lastMsg = interviewMessages[interviewMessages.length - 1];
    if (lastMsg?.role === 'assistant' && getMessageText(lastMsg).includes('[READY_TO_ANALYZE]') && !interviewReady) {
      setInterviewReady(true);
      setTimeout(() => {
        handleLaunchAnalysis();
      }, 1500);
    }
  }, [interviewMessages]);

  // Post-report follow-up chat — custom transport reads resultRef at send time
  const resultRef = useRef(result);
  resultRef.current = result;

  const followUpTransport = useMemo(() => ({
    sendMessages(opts) {
      const transport = new DefaultChatTransport({
        api: '/api/chat',
        body: { artifactContext: resultRef.current || '' },
      });
      return transport.sendMessages(opts);
    },
  }), []);

  const { messages: followUpMessages, sendMessage: sendFollowUpMsg, status: followUpStatus, error: followUpError } = useChat({
    id: 'followup-chat',
    transport: followUpTransport,
    onError: (err) => console.error('[Follow-Up Chat Error]', err),
  });

  const interviewLoading = interviewStatus === 'streaming' || interviewStatus === 'submitted';
  const followUpLoading = followUpStatus === 'streaming' || followUpStatus === 'submitted';

  const sendInterview = (e) => {
    e?.preventDefault?.();
    if (!interviewInputText.trim() || interviewLoading) return;
    sendInterviewMsg({ text: interviewInputText });
    setInterviewInputText('');
  };

  const sendFollowUp = (e) => {
    e?.preventDefault?.();
    if (!followUpInputText.trim() || followUpLoading) return;
    sendFollowUpMsg({ text: followUpInputText });
    setFollowUpInputText('');
  };

  useEffect(() => {
    if (followUpMessages.length >= 2) {
      const pairs = [];
      for (let i = 0; i < followUpMessages.length; i += 2) {
        if (followUpMessages[i]?.role === 'user' && followUpMessages[i + 1]?.role === 'assistant') {
          pairs.push({ question: getMessageText(followUpMessages[i]), answer: getMessageText(followUpMessages[i + 1]) });
        }
      }
      setQaHistory(pairs);
    }
  }, [followUpMessages]);

  useEffect(() => {
    interviewChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewMessages, agentQuestions]);

  useEffect(() => {
    followUpChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [followUpMessages]);

  const getFullReport = () => {
    const reportContent = result || streamingReport;
    if (!reportContent) return '';
    if (qaHistory.length === 0) return reportContent;
    let appendix = '\n\n---\n\n## Follow-Up Q&A\n\n';
    qaHistory.forEach((qa, i) => {
      appendix += `### Q${i + 1}: ${qa.question}\n\n${qa.answer}\n\n`;
    });
    return reportContent + appendix;
  };

  // Step 1: Handle uploads
  const handleImageUpload = (e) => {
    setImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };
  const handleFileUpload = (e) => {
    setBusinessFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const handleProceedToInterview = async () => {
    setUploading(true);
    try {
      const urls = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', `${Date.now()}-${file.name}`);

        const resp = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await resp.json();

        if (!uploadData.success) throw new Error(`Upload failed: ${uploadData.error}`);
        urls.push(uploadData.url);
      }
      setImageUrls(urls);
      setStep(STEPS.INTERVIEW);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Step 2 → 3: Launch analysis (called automatically on [READY_TO_ANALYZE])
  const handleLaunchAnalysis = async () => {
    const transcript = interviewMessages.map(m => `${m.role === 'user' ? 'Client' : 'Consultant'}: ${getMessageText(m)}`).join('\n\n');
    setInterviewTranscript(transcript);
    setStep(STEPS.ANALYZING);
    setAgentStates({});
    setAgentQuestions([]);

    try {
      // Parse interview
      const parseResp = await fetch('/api/parse-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, uploadedImageUrls: imageUrls, uploadedFileNames: businessFiles.map(f => f.name) })
      });
      const parseData = await parseResp.json();
      if (!parseData.success) throw new Error(parseData.error);

      const inputs = { ...parseData.data, imageUrls, sessionId: Date.now().toString() };
      sessionIdRef.current = inputs.sessionId;
      setParsedInputs(inputs);

      // Run parallel analysis via SSE
      const resp = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setProgressBatches(prev => [...prev, { step: event.step, total: event.total, label: event.label }]);
              }

              if (event.type === 'agent_start') {
                setAgentStates(prev => ({ ...prev, [event.agent]: { status: 'running', label: event.label } }));
              }

              if (event.type === 'agent_question') {
                setAgentStates(prev => ({ ...prev, [event.agent]: { ...prev[event.agent], status: 'question' } }));
                setAgentQuestions(prev => [...prev, { agent: event.agent, label: event.label, question: event.question }]);
              }

              if (event.type === 'agent_done') {
                setAgentStates(prev => ({ ...prev, [event.agent]: { status: 'done', label: event.label, data: event.data } }));
                setAgentQuestions(prev => prev.map(q => q.agent === event.agent ? { ...q, answered: true } : q));
              }

              if (event.type === 'report_start') {
                setStep(STEPS.RESULTS);
                setStreamingReport('');
              }

              if (event.type === 'report_chunk') {
                setStreamingReport(prev => prev + event.chunk);
              }

              if (event.type === 'complete') {
                setResult(event.report);
                setAgentData(event.data);
                // Fallback in case we skipped report_start
                if (step !== STEPS.RESULTS) {
                  setStep(STEPS.RESULTS);
                }

                // Generate a smart title
                const nameStr = inputs.businessName || inputs.businessType || 'business';
                const safeName = nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                const smartFilename = `${safeName}_strategy_report_${Date.now()}.md`;

                try { await fetch('/api/artifacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: event.report, filename: smartFilename }) }); } catch (_) { }
              }

              if (event.type === 'error') throw new Error(event.error);
            } catch (_) { }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnswerQuestion = async (agentKey, answerText) => {
    if (!answerText.trim() || !sessionIdRef.current) return;

    // Optimistically mark as answered
    setAgentQuestions(prev => prev.map(q => q.agent === agentKey ? { ...q, answered: true, answerText } : q));

    try {
      await fetch('/api/simulate/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, agent: agentKey, answer: answerText })
      });
    } catch (e) {
      console.error('Failed to send answer', e);
    }
  };

  const handleSaveWithQA = async () => {
    try {
      const nameStr = parsedInputs?.businessName || parsedInputs?.businessType || 'business';
      const safeName = nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const smartFilename = `${safeName}_strategy_report_${Date.now()}.md`;

      const resp = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: getFullReport(), filename: smartFilename })
      });
      const data = await resp.json();
      if (data.success) window.location.href = '/artifacts';
    } catch (e) { setError(e.message); }
  };

  const renderSources = (sources) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources</p>
        {sources.filter(s => s).map((src, i) => (
          <a key={i} href={src} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', wordBreak: 'break-all', marginBottom: '0.1rem', textDecoration: 'underline' }}>
            {src.length > 70 ? src.substring(0, 70) + '...' : src}
          </a>
        ))}
      </div>
    );
  };

  // Agent status indicators
  const AGENT_ORDER = ['agent1', 'agent2', 'agent5', 'agent3', 'agent4', 'agent7', 'agent6', 'agent8', 'agent10', 'agent11', 'agent12', 'agent13'];
  const getAgentIcon = (status) => {
    if (status === 'running') return '🔄';
    if (status === 'question') return '❓';
    if (status === 'done') return '✅';
    return '⏳';
  };

  return (
    <div className="container" style={{ maxWidth: step === STEPS.RESULTS ? '1400px' : step === STEPS.ANALYZING ? '1100px' : '900px' }}>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
        {['Upload', 'Interview', 'Analysis', 'Report'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700,
              background: step >= i ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
              color: step >= i ? 'white' : 'var(--text-dim)',
              border: step >= i ? 'none' : '1px solid var(--border-subtle)',
              transition: 'all 0.3s ease'
            }}>{i + 1}</div>
            <span style={{ fontSize: '0.85rem', color: step >= i ? 'var(--text-primary)' : 'var(--text-dim)', fontWeight: step === i ? 600 : 400 }}>{label}</span>
            {i < 3 && <div style={{ width: '40px', height: '1px', background: step > i ? 'var(--accent-blue)' : 'var(--border-subtle)' }}></div>}
          </div>
        ))}
      </div>

      {error && (
        <div className="glass-panel" style={{ border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1rem' }}>
          <h3 style={{ color: '#ef4444' }}>Error</h3>
          <p>{error}</p>
          <button onClick={() => setError('')} className="btn-secondary" style={{ marginTop: '0.75rem' }}>Dismiss</button>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === STEPS.UPLOAD && (
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>New Business Analysis</h1>
          <p style={{ marginBottom: '2rem' }}>Upload photos and files, then we'll have a brief conversation to understand your business before running the analysis.</p>

          <div className="glass-panel">
            <div className="form-group">
              <label>Business Photos (products, storefront, branding, etc.)</label>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
              {imageFiles.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {imageFiles.map((f, i) => (
                    <div key={i} style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Business Files (sales spreadsheets, employee data, financial records — optional)</label>
              <input type="file" accept=".csv,.xlsx,.xls,.pdf,.txt" multiple onChange={handleFileUpload} />
              {businessFiles.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  {businessFiles.map((f, i) => <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📄 {f.name}</p>)}
                </div>
              )}
            </div>
            <button onClick={handleProceedToInterview} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={uploading}>
              {uploading ? 'Uploading...' : (imageFiles.length > 0 || businessFiles.length > 0)
                ? `Continue with ${imageFiles.length} photo${imageFiles.length !== 1 ? 's' : ''} & ${businessFiles.length} file${businessFiles.length !== 1 ? 's' : ''}`
                : 'Skip uploads & start interview'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Interview */}
      {step === STEPS.INTERVIEW && (
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Tell us about your business</h1>
          <p style={{ marginBottom: '1.5rem' }}>Our consultant will ask a few questions to understand your business, market, and what you need help with.</p>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '550px', padding: '1.25rem' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.5rem' }}>
              {interviewMessages.length === 0 && !interviewLoading && (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', margin: 'auto' }}>
                  Type a message to start the conversation. Tell us about your business!
                </p>
              )}
              {interviewMessages.map(m => (
                <div key={m.id} className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                  <Md>{getMessageText(m).replace('[READY_TO_ANALYZE]', '')}</Md>
                </div>
              ))}
              {interviewLoading && (
                <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{ width: '14px', height: '14px', margin: 0, borderWidth: '2px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Thinking...</span>
                </div>
              )}
              {interviewReady && (
                <div className="chat-bubble chat-bubble-assistant" style={{ background: 'rgba(20,184,166,0.15)', borderColor: 'rgba(20,184,166,0.3)' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--accent-teal)', fontWeight: 600 }}>✓ Starting comprehensive analysis...</p>
                </div>
              )}
              <div ref={interviewChatEndRef}></div>
            </div>

            {!interviewReady && (
              <form onSubmit={sendInterview} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input value={interviewInputText} onChange={(e) => setInterviewInputText(e.target.value)} placeholder="e.g. I run a cotton mill in El Paso, TX..." style={{ flex: 1 }} />
                <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem' }} disabled={interviewLoading}>Send</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Analyzing — Split View */}
      {step === STEPS.ANALYZING && (
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Researching Your Market</h1>
          <p style={{ marginBottom: '1.5rem' }}>8 specialized research agents are working in parallel across economic dimensions.</p>

          <div style={{ display: 'grid', gridTemplateColumns: agentQuestions.length > 0 ? '1fr 1fr' : '1fr', gap: '1.25rem' }}>
            {/* Agent Progress Cards */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--accent-cyan)' }}>Research Agents</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {AGENT_ORDER.map(key => {
                  const state = agentStates[key];
                  if (!state) return null;
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.85rem',
                      background: state.status === 'running' ? 'rgba(59,130,246,0.08)' :
                        state.status === 'question' ? 'rgba(245,158,11,0.08)' :
                          'rgba(20,184,166,0.05)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${state.status === 'running' ? 'var(--accent-blue)' :
                        state.status === 'question' ? '#f59e0b' :
                          'var(--accent-teal)'}`,
                      animation: 'fadeIn 0.3s ease'
                    }}>
                      {state.status === 'running' ? (
                        <div className="spinner" style={{ width: '14px', height: '14px', margin: 0, borderWidth: '2px' }}></div>
                      ) : (
                        <span style={{ fontSize: '0.85rem' }}>{getAgentIcon(state.status)}</span>
                      )}
                      <span style={{ flex: 1, fontSize: '0.85rem', color: state.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {state.label}
                      </span>
                      {state.status === 'done' && <span style={{ fontSize: '0.7rem', color: 'var(--accent-teal)' }}>Complete</span>}
                      {state.status === 'question' && <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Has question</span>}
                    </div>
                  );
                })}
                {Object.keys(agentStates).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Parsing interview & initializing agents...</p>
                  </div>
                )}
              </div>

              {/* Batch progress */}
              {progressBatches.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  {progressBatches.map((b, i) => (
                    <p key={i} style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--accent-cyan)' }}>Batch {b.step}/{b.total}:</span> {b.label}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Questions Panel */}
            {agentQuestions.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#f59e0b' }}>🔍 Clarification Questions</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  Some agents wanted more context. Your answers will improve the final report.
                </p>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {agentQuestions.map((q, i) => (
                    <div key={i} style={{
                      padding: '0.75rem',
                      background: q.answered ? 'var(--bg-elevated)' : 'rgba(245,158,11,0.06)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${q.answered ? 'var(--accent-teal)' : '#f59e0b'}`,
                    }}>
                      <p style={{ fontSize: '0.75rem', color: q.answered ? 'var(--accent-teal)' : '#f59e0b', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase' }}>{q.label}</p>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{q.question}</p>

                      {q.answered ? (
                        <div style={{ background: 'rgba(20,184,166,0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>You:</span> {q.answerText || 'Answer submitted'}
                        </div>
                      ) : (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.target.elements.answer;
                          handleAnswerQuestion(q.agent, input.value);
                        }} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input name="answer" placeholder="Type your answer..." style={{ flex: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} required />
                          <button type="submit" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Reply</button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: Results */}
      {step === STEPS.RESULTS && (result || streamingReport) && (
        <div>
          {/* Interview Summary Card */}
          <div className="glass-panel" style={{ marginBottom: '1.25rem', borderColor: 'rgba(59,130,246,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: 'var(--accent-blue)', margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Needfinding Interview</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {interviewMessages.filter(m => m.role === 'user').length} exchanges ·
                  {imageUrls.length > 0 && ` ${imageUrls.length} photos uploaded ·`}
                  {businessFiles.length > 0 && ` ${businessFiles.length} files uploaded ·`}
                  {' '}Core question: <em>{parsedInputs?.coreQuestion || 'Pricing strategy'}</em>
                </p>
              </div>
              <details style={{ fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>View transcript</summary>
                <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text-dim)' }}>
                  {interviewTranscript}
                </div>
              </details>
            </div>
          </div>

          {/* Research Summary */}
          <div className="glass-panel" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Research Summary</h2>
            <div className="grid grid-cols-2" style={{ gap: '0.75rem' }}>
              {[
                { key: 'agent1', title: 'Brand & Value Perception', render: (d) => (<><p><strong>Classification:</strong> {d?.classification} ({d?.score})</p><p><strong>Impact:</strong> {d?.impact}</p></>) },
                { key: 'agent11', title: 'Demand Validation', render: (d) => (<><p><strong>Demand:</strong> {d?.demandLevel}</p><p><strong>Daily Cust:</strong> ≈{d?.estimatedDailyCustomers}</p><p><strong>WTP:</strong> {d?.willingnessToPay}</p></>) },
                { key: 'agent10', title: 'Real Estate & Rent', render: (d) => (<><p><strong>Rent:</strong> ${d?.estimatedMonthlyRent?.toLocaleString()}</p><p><strong>SqFt:</strong> {d?.assumedSquareFootage} (@${d?.pricePerSqFtAnnual}/yr)</p><p><strong>Total Occupancy:</strong> ${d?.totalMonthlyOccupancyCost?.toLocaleString()}</p></>) },
                { key: 'agent12', title: 'Legal & Regulatory', render: (d) => (<><p><strong>Legal Risk:</strong> {d?.legalRiskLevel}</p><p><strong>Licenses:</strong> {d?.requiredLicenses?.length}</p><p><strong>Compliance Cost:</strong> ${d?.estimatedComplianceCost?.toLocaleString()}</p></>) },
                { key: 'agent2', title: 'Demographics & Income', render: (d) => (<><p><strong>Median Income:</strong> ${d?.medianIncome?.toLocaleString()}</p><p><strong>Price Ceiling:</strong> ${d?.priceCeiling}</p><p><strong>Neighborhood:</strong> {d?.neighborhoodType}</p></>) },
                { key: 'agent4', title: 'Social Sentiment', render: (d) => (<><p><strong>Sentiment:</strong> {d?.sentimentScore}</p>{d?.rawData?.positiveThemes?.length > 0 && <p><strong>+:</strong> {d.rawData.positiveThemes.join(', ')}</p>}{d?.rawData?.negativeThemes?.length > 0 && <p><strong>−:</strong> {d.rawData.negativeThemes.join(', ')}</p>}</>) },
                { key: 'agent8', title: 'Competitive Landscape', render: (d) => (<><p><strong>Avg Price:</strong> ${d?.avgCompetitorPrice}</p><p><strong>Strategy:</strong> {d?.strategyMode}</p><p><strong>Saturation:</strong> {d?.marketSaturation}</p>{d?.competitors?.map((c, i) => <p key={i} style={{ fontSize: '0.8rem' }}>• <strong>{c.name}</strong> ({c.priceRange})</p>)}</>) },
                { key: 'agent5', title: 'Macroeconomic Indicators', render: (d) => (<><p><strong>Inflation:</strong> {d?.inflationRate}%</p><p><strong>Fed Rate:</strong> {d?.interestRate}%</p><p><strong>Outlook:</strong> {d?.spendingOutlook}</p></>) },
                { key: 'agent6', title: 'Supply Chain & Costs', render: (d) => (<><p><strong>True Cost/Unit:</strong> ${d?.trueAcquisitionCostPerSellableUnit}</p><p><strong>Yield:</strong> {(d?.yieldRate * 100).toFixed(0)}%</p><p><strong>Markup:</strong> {d?.industryTypicalMarkup}</p></>) },
                { key: 'agent7', title: 'Location & Mobility', render: (d) => (<><p><strong>Transit:</strong> {d?.transitStatus}</p><p><strong>Multiplier:</strong> {d?.footTrafficMultiplier}x</p><p><strong>Nearby:</strong> {d?.nearbyAnchors}</p></>) },
                { key: 'agent3', title: 'Internal Data & Elasticity', render: (d) => (<><p><strong>PED:</strong> {d?.priceElasticityDemand}</p><p><strong>Avg Transaction:</strong> ${d?.avgTransactionValue}</p></>) },
                { key: 'agent13', title: 'Financial Engineering', render: (d) => (<><p><strong>Margin:</strong> {d?.unitEconomics?.marginPercentage}%</p><p><strong>Break-Even:</strong> {d?.breakEvenAnalysis?.breakEvenUnits} units / ${d?.breakEvenAnalysis?.breakEvenRevenue?.toLocaleString()}</p><p><strong>Strategy Score:</strong> {(d?.financialStrategyScore || 0).toFixed(2)}</p></>) },
              ].map(({ key, title, render }) => (
                <details key={key} className="research-card">
                  <summary>{title}</summary>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {render(agentData?.[key])}
                    {agentData?.[key]?.reasoning && <p style={{ marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{agentData[key].reasoning}</p>}
                    {renderSources(agentData?.[key]?.sources)}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Agent Questions Summary (if any were asked) */}
          {agentQuestions.length > 0 && (
            <div className="glass-panel" style={{ marginBottom: '1.25rem', borderColor: 'rgba(245,158,11,0.2)' }}>
              <h3 style={{ color: '#f59e0b', margin: '0 0 0.75rem 0', fontSize: '0.9rem' }}>🔍 During Research — Agent Clarification Questions</h3>
              {agentQuestions.map((q, i) => (
                <div key={i} style={{ padding: '0.5rem 0', borderBottom: i < agentQuestions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>{q.label}</p>
                  <p style={{ fontSize: '0.85rem' }}>{q.question}</p>
                </div>
              ))}
            </div>
          )}

          {/* Complete bar */}
          <div className="glass-panel" style={{ background: 'rgba(20,184,166,0.06)', borderColor: 'rgba(20,184,166,0.2)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--accent-teal)', margin: 0 }}>
                  {result ? 'Analysis Complete' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div className="spinner" style={{ width: '14px', height: '14px', margin: 0, borderWidth: '2px', borderTopColor: 'var(--accent-teal)' }}></div> Streaming Report...</span>}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  {result ? 'Ask follow-up questions — they\'ll be appended to the report.' : 'The orchestrator is securely building your report.'}
                  {qaHistory.length > 0 && <span style={{ color: 'var(--accent-cyan)' }}> ({qaHistory.length} Q&A included)</span>}
                </p>
              </div>
              {result && (
                <button onClick={handleSaveWithQA} className="btn-primary">
                  {qaHistory.length > 0 ? 'Publish Report + Q&A' : 'Publish Report'}
                </button>
              )}
            </div>
          </div>

          {/* Report + Chat */}
          <div className="grid grid-cols-2" style={{ alignItems: 'start', gridTemplateColumns: '1.4fr 1fr' }}>
            <div className="artifact-content" style={{ marginTop: 0, height: '700px', overflowY: 'auto' }}>
              <Md>{getFullReport()}</Md>
            </div>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '700px', padding: '1.25rem' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem', fontSize: '1rem' }}>Follow-Up Questions</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {followUpMessages.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', margin: 'auto' }}>
                    Ask about the report — the system can search the web for additional data.
                  </p>
                ) : followUpMessages.map(m => (
                  <div key={m.id} className={`chat-bubble ${m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                    <Md>{getMessageText(m)}</Md>
                  </div>
                ))}
                {followUpLoading && <div className="chat-bubble chat-bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div className="spinner" style={{ width: '14px', height: '14px', margin: 0, borderWidth: '2px' }}></div><span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Researching...</span></div>}
                {followUpError && <div style={{ color: '#ff6b6b', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,107,107,0.1)', borderRadius: '6px' }}>Error: {followUpError.message}</div>}
                <div ref={followUpChatEndRef}></div>
              </div>
              <form onSubmit={sendFollowUp} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input value={followUpInputText} onChange={(e) => setFollowUpInputText(e.target.value)} placeholder="e.g. What if I lowered the price by $1?" style={{ flex: 1 }} />
                <button type="submit" className="btn-primary" style={{ padding: '0 1.25rem' }} disabled={followUpLoading}>Ask</button>
              </form>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button onClick={() => { setStep(STEPS.UPLOAD); setResult(null); setStreamingReport(''); setAgentData(null); setProgressBatches([]); setAgentStates({}); setAgentQuestions([]); setQaHistory([]); setImageFiles([]); setImageUrls([]); setBusinessFiles([]); setInterviewReady(false); setParsedInputs(null); }} className="btn-secondary">
              Start New Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
