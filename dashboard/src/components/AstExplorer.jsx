import React, { useState } from 'react';
import { GitCompare, FileCode, CheckCircle2, ShieldCheck, Box } from 'lucide-react';

export function AstExplorer({ astContent, currentDiff, testResults }) {
  const [activeTab, setActiveTab] = useState('ast'); // 'ast' | 'diff' | 'sandbox'

  return (
    <div className="glass-panel ast-explorer-card">
      <div className="card-header">
        <div className="card-title">
          <FileCode size={18} />
          <span>AST Haritası, Git Patch & Sandbox Doğrulama</span>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className={`preset-btn ${activeTab === 'ast' ? 'active' : ''}`}
            onClick={() => setActiveTab('ast')}
            style={activeTab === 'ast' ? { background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' } : {}}
          >
            Tree-Sitter AST (.agent/ast_map.md)
          </button>
          <button
            type="button"
            className={`preset-btn ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
            style={activeTab === 'diff' ? { background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' } : {}}
          >
            Aktif Git Patch (Implementor)
          </button>
          <button
            type="button"
            className={`preset-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
            style={activeTab === 'sandbox' ? { background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)' } : {}}
          >
            Docker Sandbox Raporu
          </button>
        </div>
      </div>

      <div className="ast-layout">
        {/* Left/Main Content Pane */}
        {activeTab === 'ast' && (
          <div className="ast-pane" style={{ gridColumn: 'span 2' }}>
            <div className="ast-pane-title">
              <FileCode size={14} color="var(--accent-cyan)" />
              <span>Tree-Sitter Tarafından Üretilen Ham Kodsuz İskelet (Context Tasarrufu: %71.4)</span>
            </div>
            <pre className="ast-pre">{astContent || 'AST haritası yükleniyor...'}</pre>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="ast-pane diff-pane" style={{ gridColumn: 'span 2' }}>
            <div className="ast-pane-title">
              <GitCompare size={14} color="var(--accent-amber)" />
              <span>Implementor Ajanının Ürettiği Unified Patch (Caveman Diff)</span>
            </div>
            <pre>
              {currentDiff ? (
                currentDiff.split('\n').map((line, idx) => {
                  let cls = '';
                  if (line.startsWith('+') && !line.startsWith('+++')) cls = 'diff-add';
                  else if (line.startsWith('-') && !line.startsWith('---')) cls = 'diff-del';
                  else if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) cls = 'diff-header';

                  return (
                    <span key={idx} className={cls}>
                      {line}
                      {'\n'}
                    </span>
                  );
                })
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Aktif patch bulunmuyor.</span>
              )}
            </pre>
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div className="ast-pane" style={{ gridColumn: 'span 2' }}>
            <div className="ast-pane-title">
              <Box size={14} color="var(--accent-emerald)" />
              <span>İzole Docker Container Test Koşum Karnesi</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="stat-box">
                  <span className="stat-box-label">Başarılı Test</span>
                  <span className="stat-box-val" style={{ color: 'var(--accent-emerald)' }}>
                    {testResults?.passed || 0} PASSED
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-box-label">Başarısız Test</span>
                  <span className="stat-box-val" style={{ color: testResults?.failed > 0 ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
                    {testResults?.failed || 0} FAILED
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-box-label">Süre</span>
                  <span className="stat-box-val">{testResults?.duration_s || '0.00'}s</span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.4rem' }}>KONTEYNER İZOLASYON VERİLERİ:</div>
                <div>Konteyner: <span style={{ color: 'var(--accent-cyan)' }}>{testResults?.container || 'docker-sandbox-01'}</span></div>
                <div>Güvenlik: <span style={{ color: 'var(--accent-emerald)' }}>Salt kısıtlı bind mount, nosuid, no-new-privileges</span></div>
                <div>Son Test Zamanı: <span style={{ color: 'var(--text-secondary)' }}>{testResults?.last_run_timestamp || 'Henüz test koşulmadı'}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
