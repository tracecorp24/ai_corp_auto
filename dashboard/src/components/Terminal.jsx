import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TermIcon, Trash2, Copy, Check, ArrowDown, Filter } from 'lucide-react';

export function Terminal({ logs, onClearLogs }) {
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (autoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs?.filter(log => {
    if (filterAgent === 'ALL') return true;
    return log.agent === filterAgent;
  }) || [];

  const handleCopy = () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.agent}] [${l.level}]: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel terminal-card">
      <div className="terminal-header">
        <div className="terminal-title">
          <TermIcon size={16} color="var(--accent-cyan)" />
          <span>Canlı Terminal & WebSocket Log Akışı</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            ({filteredLogs.length} satır)
          </span>
        </div>

        <div className="terminal-actions">
          {/* Agent Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={13} color="var(--text-muted)" />
            <select
              className="filter-select"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
            >
              <option value="ALL">Tüm Ajanlar</option>
              <option value="MANAGER">Manager</option>
              <option value="PLANNER">Planner</option>
              <option value="EXPLORER">Explorer</option>
              <option value="DEVELOPER">Developer</option>
              <option value="IMPLEMENTOR">Implementor</option>
              <option value="TESTER">Tester</option>
              <option value="ANALYST">Analyst</option>
              <option value="CIRCUIT_BREAKER">Circuit Breaker</option>
            </select>
          </div>

          {/* Auto Scroll Toggle */}
          <button
            type="button"
            className="term-action-btn"
            style={{ color: autoScroll ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Otomatik kaydırmayı aç/kapat"
          >
            <ArrowDown size={12} />
            <span>Oto-Kaydır</span>
          </button>

          {/* Copy Logs */}
          <button
            type="button"
            className="term-action-btn"
            onClick={handleCopy}
            title="Logları Kopyala"
          >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            className="term-action-btn"
            onClick={onClearLogs}
            title="Terminali Temizle"
          >
            <Trash2 size={12} />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      <div className="terminal-body" ref={bodyRef}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>
            Filtreye uygun log kaydı bulunamadı.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-line">
              <span className="log-time">{log.timestamp}</span>
              <span className={`log-agent-tag agent-${log.agent}`}>{log.agent}</span>
              <div className="log-content-wrap" style={{ flex: 1 }}>
                <span className={`log-msg level-${log.level}`}>{log.message}</span>
                {log.payload && (
                  <div className="caveman-payload-box">
                    <span style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>CAVEMAN PROTOCOL: </span>
                    <code>{JSON.stringify(log.payload, null, 2)}</code>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
