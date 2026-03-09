'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ReportViewer({ file, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(file.publicUrl);
        if (!resp.ok) throw new Error('Failed to fetch');
        setContent(await resp.text());
      } catch {
        setContent('Error loading report.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [file.publicUrl]);

  // Escape key to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = () => {
    if (!content) return;
    try {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      {/* Floating close button — always visible */}
      <button onClick={onClose} style={{
        position: 'fixed', top: '1rem', right: '1.5rem', zIndex: 1001,
        background: 'rgba(239,68,68,0.9)', color: 'white',
        border: 'none', borderRadius: '50%',
        width: '44px', height: '44px',
        fontSize: '1.3rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'transform 0.15s, background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Close (Esc)"
      >✕</button>

      {/* Header Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', paddingRight: '5rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 25, 47, 0.9)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>
            📄 {file.name.replace('.md', '').replace(/_/g, ' ')}
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Generated {new Date(file.created_at).toLocaleString()} · Press Esc to close
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDownload} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} disabled={loading}>
            ↓ Download Markdown
          </button>
          <a href={file.publicUrl} target="_blank" rel="noopener noreferrer"
            className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ↗ Open Raw
          </a>
        </div>
      </div>

      {/* Report Content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '2.5rem 3rem',
        maxWidth: '900px', margin: '0 auto', width: '100%',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-dim)' }}>Loading report...</p>
          </div>
        ) : (
          <div className="artifact-content" style={{
            marginTop: 0, lineHeight: 1.8,
            fontSize: '1rem',
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactCard({ file, onOpen }) {
  const defaultName = file.name.replace('.md', '').replace(/_[0-9]+$/, '').replace(/_/g, ' ');
  const [title, setTitle] = useState(defaultName);
  const [summary, setSummary] = useState('Comprehensive business analysis with pricing strategy, competitive landscape, and actionable recommendations.');
  
  useEffect(() => {
    async function loadMeta() {
      try {
        const resp = await fetch(file.publicUrl);
        const text = await resp.text();
        
        // 1. Extract the actual smart title from the H1
        const h1Match = text.match(/^#\s+(.+)$/m);
        if (h1Match) setTitle(h1Match[1].replace(/[*_]/g, '')); // remove bolding

        // 2. Extract a high-level summary from the Executive Summary
        const execMatch = text.match(/##\s+Executive Summary\s*\n+([^#]+)/i);
        if (execMatch) {
          // Get the first meaty paragraph
          const paragraphs = execMatch[1].split('\n').map(p => p.trim()).filter(p => p.length > 20);
          if (paragraphs.length > 0) {
            let desc = paragraphs[0].replace(/[*_]/g, ''); // strip markdown bold syntax
            if (desc.length > 140) desc = desc.substring(0, 137) + '...';
            setSummary(desc);
          }
        }
      } catch (err) {}
    }
    loadMeta();
  }, [file.publicUrl]);

  const dateStr = new Date(file.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const timeStr = new Date(file.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      borderLeft: '3px solid var(--accent-cyan)',
      display: 'flex', flexDirection: 'column'
    }}
      onClick={() => onOpen(file)}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-cyan)', lineHeight: 1.3, paddingRight: '0.5rem' }}>
          {title}
        </h3>
        <span style={{
          fontSize: '0.75rem', padding: '0.2rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(20,184,166,0.15)',
          color: 'var(--accent-teal)',
          border: '1px solid rgba(20,184,166,0.3)',
          whiteSpace: 'nowrap',
          marginTop: '0.1rem'
        }}>
          Strategy Report
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5, flex: 1 }}>
        {summary}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          📅 {dateStr}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
          Read Report →
        </span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/artifacts', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);
        setArtifacts(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="container loader-container"><div className="spinner"></div><p>Loading reports...</p></div>
  );

  return (
    <div className="container">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Published Reports</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px' }}>
          Your strategy reports with research findings, pricing recommendations, and follow-up Q&A. Click any report to read the full analysis.
        </p>
      </div>

      {error ? (
        <div className="glass-panel" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <h3 style={{ color: '#ef4444' }}>Failed to load</h3><p>{error}</p>
        </div>
      ) : artifacts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Reports Yet</h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Run your first business analysis to generate a comprehensive strategy report.
          </p>
          <Link href="/simulate" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>
            Start Analysis
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
          {artifacts.map((file) => <ArtifactCard key={file.id} file={file} onOpen={setViewingFile} />)}
        </div>
      )}

      {viewingFile && <ReportViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
}
